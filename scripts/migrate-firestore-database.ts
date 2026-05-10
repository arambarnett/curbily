/**
 * Migrate Firestore data between databases in one GCP/Firestore project (multi-database).
 *
 * DEFAULT: copies ONLY the root `users` collection (Firestore profile docs —
 * one document per UID). No subcollections. Use --full later for everything else.
 *
 * Prerequisites:
 * - Application Default Credentials OR GOOGLE_APPLICATION_CREDENTIALS pointing at a
 *   service account that has read on the source DB and write on the target DB.
 * - Target database `prod-db-v3` must already exist in Firebase console.
 *
 * Important: `gcloud config set project` does NOT change Application Default Credentials.
 * Use ONE of:
 *   1) Service account JSON: export GOOGLE_APPLICATION_CREDENTIALS=/path/key.json
 *   2) User ADC (must match a Google account with Firestore access on THIS project):
 *        gcloud auth application-default login
 *      Optionally: gcloud auth application-default set-quota-project video-editor-441419
 *
 * Usage:
 *   # Minimal permission check (reads one placeholder doc — still needs IAM).
 *   npx tsx scripts/migrate-firestore-database.ts --diagnose
 *
 *   # Dry run — count user profile docs only, no writes
 *   npx tsx scripts/migrate-firestore-database.ts
 *
 *   # Actually copy users → target DB (needs MIGRATE_CONFIRM=1)
 *   MIGRATE_CONFIRM=1 npx tsx scripts/migrate-firestore-database.ts --execute
 *
 *   # OPTIONAL: migrate all root collections recursively (everything else later)
 *   # MIGRATE_CONFIRM=1 ... --execute --full
 *
 *   # OPTIONAL: arbitrary root collections; add --shallow to skip subs
 *   # --collections=contacts,projects  [--shallow]
 *
 *   # OPTIONAL: process only first N docs per targeted root collection (selective migrations only):
 *   # --limit=1
 *
 * Optional env:
 *   SOURCE_FIRESTORE_DB=ai-studio-...   (default: ai-studio id below)
 *   TARGET_FIRESTORE_DB=prod-db-v3      (default: prod-db-v3)
 *   GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT overrides firebase-applet-config projectId if set
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { initializeApp, getApps, getApp } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { DocumentReference, DocumentData } from "firebase-admin/firestore";

const DEFAULT_SOURCE = "ai-studio-5fc5ad64-7205-4eb5-9d55-8e67aab2e08a";
const DEFAULT_TARGET = "prod-db-v3";

const SOURCE_ID = process.env.SOURCE_FIRESTORE_DB || DEFAULT_SOURCE;
const TARGET_ID = process.env.TARGET_FIRESTORE_DB || DEFAULT_TARGET;

const execute = process.argv.includes("--execute");
const diagnose = process.argv.includes("--diagnose");
/** Full-database migration (legacy): every root collection, recurse subcollections */
const fullMigrate =
  process.argv.includes("--full") || process.argv.includes("--all");

const collectionsArgRaw = process.argv.find((a) =>
  a.startsWith("--collections="),
);
const explicitCollections = collectionsArgRaw
  ? collectionsArgRaw
      .slice("--collections=".length)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const usersShortcut = process.argv.includes("--users-only");

const limitArgv = process.argv.find((a) => a.startsWith("--limit="));
let DOC_LIMIT = 0;
if (limitArgv) {
  const n = Number.parseInt(limitArgv.slice("--limit=".length).trim(), 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[migrate] "--limit=N" expects a positive integer (e.g. --limit=1)');
    process.exit(1);
  }
  DOC_LIMIT = n;
}

let onlyCollections: string[] | null;
let shallow: boolean;

if (fullMigrate && DOC_LIMIT > 0) {
  console.error("--limit is only for selective migrations (default users-only or --collections=...)");
  process.exit(1);
}
if (fullMigrate && (explicitCollections?.length || usersShortcut)) {
  console.error("--full migrates everything; remove --collections and --users-only.");
  process.exit(1);
}
if (explicitCollections?.length && usersShortcut) {
  console.error("Use either --collections=... or --users-only — not both.");
  process.exit(1);
}

if (fullMigrate) {
  onlyCollections = null;
  shallow = false;
} else if (explicitCollections && explicitCollections.length > 0) {
  onlyCollections = explicitCollections;
  shallow = process.argv.includes("--shallow");
} else if (usersShortcut) {
  onlyCollections = ["users"];
  shallow = true;
} else {
  /** Default migration: Firestore profile rows only */
  onlyCollections = ["users"];
  shallow = true;
}

const PROGRESS_EVERY_DOCS = Number(process.env.MIGRATE_PROGRESS_EVERY || 250);
const HEARTBEAT_MS = Number(process.env.MIGRATE_HEARTBEAT_MS || 30000);

type MigrationStats = {
  documents: number;
  writes: number;
  startedAtMs: number;
  lastLogAtDocs: number;
};

function loadDefaultProjectId(): string {
  try {
    const root = dirname(fileURLToPath(import.meta.url));
    const raw = readFileSync(join(root, "..", "firebase-applet-config.json"), "utf8");
    const parsed = JSON.parse(raw) as { projectId?: string };
    if (parsed.projectId) return parsed.projectId;
  } catch {
    // fallback below
  }
  return "video-editor-441419";
}

/** Always pin Firebase project — anonymous initializeApp() + wrong ADC project is a common PERMISSION_DENIED cause. */
function getResolvedProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    loadDefaultProjectId()
  );
}

function logCredentialHints(projectId: string) {
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  console.log("\n[Creds]");
  console.log(`  GCP project ID (explicit): ${projectId}`);
  console.log(`  GOOGLE_APPLICATION_CREDENTIALS: ${saPath ?? "(not set — using Application Default Credentials)"}`);
  console.log("");
}

function printPermissionHelp(projectId: string) {
  console.error(`
[FIRESTORE PERMISSION_DENIED]

The Admin SDK is calling project "${projectId}" but the credential in use cannot read that Firestore database.

Fix (pick one credential path):
  • Service account (recommended): Firebase console → Project settings → Service accounts
    → Generate new private key → then:
      export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-project-xxxxx.json
    Grant that SA at least roles/datastore.user on project ${projectId} (Datastore User covers Firestore reads/writes for Admin SDK).

  • User ADC:
      gcloud auth application-default login
    Use a Google identity that has "Cloud Data Store User", "Editor", or "Owner" on ${projectId}.
    Optionally:
      gcloud auth application-default set-quota-project ${projectId}

Note: \`gcloud config set project\` only affects the gcloud CLI, not npm/Node Firebase Admin.`,
  );
}

async function diagnoseAccess(app: App, databaseId: string) {
  const db = getFirestore(app, databaseId);
  console.log(`[DIAGNOSE] database=${databaseId}`);
  await db.doc("__migrate_probe__/nonexistent").get();
  const roots = await db.listCollections();
  console.log(`[OK] Connected. Root collections (${roots.length}): ${roots.map((c) => c.id).join(", ") || "(none visible)"}`);
}

async function copyDocumentTree(
  sourceRef: DocumentReference,
  targetRef: DocumentReference,
  dryRun: boolean,
  stats: MigrationStats,
  recurseSubcollections: boolean,
): Promise<void> {
  const snap = await sourceRef.get();
  if (!snap.exists) return;

  stats.documents += 1;
  const data = snap.data() as DocumentData | undefined;
  if (!dryRun && data !== undefined) {
    await targetRef.set(data);
    stats.writes += 1;
  }
  if (stats.documents - stats.lastLogAtDocs >= PROGRESS_EVERY_DOCS) {
    const elapsedSec = Math.max(1, Math.round((Date.now() - stats.startedAtMs) / 1000));
    const rate = (stats.documents / elapsedSec).toFixed(2);
    console.log(`[PROGRESS] docs=${stats.documents} writes=${stats.writes} rate=${rate}/s`);
    stats.lastLogAtDocs = stats.documents;
  }

  if (!recurseSubcollections) return;

  const subcollections = await sourceRef.listCollections();
  for (const sub of subcollections) {
    const qs = await sub.get();
    for (const doc of qs.docs) {
      await copyDocumentTree(
        doc.ref,
        targetRef.collection(sub.id).doc(doc.id),
        dryRun,
        stats,
        true,
      );
    }
  }
}

async function main() {
  const projectId = getResolvedProjectId();

  if (execute && diagnose) {
    console.error("Use either --execute or --diagnose, not both.");
    process.exit(1);
  }

  if (execute && process.env.MIGRATE_CONFIRM !== "1") {
    console.error(
      "Refusing to write: set MIGRATE_CONFIRM=1 when using --execute.\n" +
        "Example: MIGRATE_CONFIRM=1 npx tsx scripts/migrate-firestore-database.ts --execute",
    );
    process.exit(1);
  }

  const app = !getApps().length ? initializeApp({ projectId }) : getApp();
  logCredentialHints(projectId);

  if (diagnose) {
    await diagnoseAccess(app, SOURCE_ID);
    console.log("\n(Source OK — testing TARGET database…)");
    await diagnoseAccess(app, TARGET_ID);
    return;
  }

  const dryRun = !execute;
  console.log(
    dryRun
      ? `[DRY RUN] Counting documents only (no writes).\n  source: ${SOURCE_ID}\n  target: ${TARGET_ID}`
      : `[EXECUTE] Copying documents.\n  source: ${SOURCE_ID}\n  target: ${TARGET_ID}`,
  );
  if (fullMigrate) {
    console.log(`[MODE] full database — all root collections + subcollections (slow, many reads)`);
  } else {
    console.log(
      `[MODE] selective shallow=${shallow} collections=${onlyCollections?.join(", ") ?? ""}${DOC_LIMIT > 0 ? ` limit_first_n=${DOC_LIMIT}` : ""}`,
    );
  }

  const sourceDb = getFirestore(app, SOURCE_ID);
  const targetDb = getFirestore(app, TARGET_ID);

  const stats: MigrationStats = {
    documents: 0,
    writes: 0,
    startedAtMs: Date.now(),
    lastLogAtDocs: 0,
  };
  const heartbeat = setInterval(() => {
    const elapsedSec = Math.max(1, Math.round((Date.now() - stats.startedAtMs) / 1000));
    const rate = (stats.documents / elapsedSec).toFixed(2);
    console.log(`[HEARTBEAT] elapsed=${elapsedSec}s docs=${stats.documents} writes=${stats.writes} rate=${rate}/s`);
  }, HEARTBEAT_MS);

  try {
    if (onlyCollections && onlyCollections.length > 0) {
      console.log(`[START] selective_root_collections=${onlyCollections.length}`);
      for (const colId of onlyCollections) {
        const qs = await sourceDb.collection(colId).get();
        console.log(`[COLLECTION] ${colId} docs=${qs.size}`);
        let docBatch = qs.docs;
        if (DOC_LIMIT > 0 && docBatch.length > DOC_LIMIT) {
          console.log(`[LIMIT] Using first ${DOC_LIMIT} of ${qs.size} doc(s) in ${colId}`);
          docBatch = docBatch.slice(0, DOC_LIMIT);
        }
        const recurseSubs = shallow ? false : true;
        for (const doc of docBatch) {
          await copyDocumentTree(
            doc.ref,
            targetDb.collection(colId).doc(doc.id),
            dryRun,
            stats,
            recurseSubs,
          );
        }
      }
    } else {
      const rootCollections = await sourceDb.listCollections();
      console.log(`[START] root_collections=${rootCollections.length}`);
      for (const col of rootCollections) {
        const qs = await col.get();
        console.log(`[COLLECTION] ${col.id} docs=${qs.size}`);
        for (const doc of qs.docs) {
          await copyDocumentTree(
            doc.ref,
            targetDb.collection(col.id).doc(doc.id),
            dryRun,
            stats,
            shallow ? false : true,
          );
        }
      }
    }
  } finally {
    clearInterval(heartbeat);
  }

  console.log(
    dryRun
      ? `Done (dry run). Documents that would be copied: ${stats.documents}`
      : `Done. Documents visited: ${stats.documents}, writes: ${stats.writes}`,
  );

  if (dryRun) {
    console.log("\nTo copy profiles (users table) into the target DB, run:");
    console.log(
      `  MIGRATE_CONFIRM=1 npx tsx scripts/migrate-firestore-database.ts --execute`,
    );
    console.log("\nLater, to migrate all other tables as well:");
    console.log(
      `  MIGRATE_CONFIRM=1 npx tsx scripts/migrate-firestore-database.ts --execute --full`,
    );
  }
}

main().catch((err) => {
  const projectId = getResolvedProjectId();
  console.error(err);
  if (
    typeof err === "object" &&
    err &&
    "code" in err &&
    (err as { code?: number }).code === 7
  ) {
    printPermissionHelp(projectId);
  }
  process.exit(1);
});
