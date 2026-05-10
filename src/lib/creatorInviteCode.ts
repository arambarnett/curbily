import {
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  collection,
} from 'firebase/firestore';
import { db } from './firebase';

/** Same ambiguous-character alphabet as manager codes; separate collection `creatorClaimCodes`. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCreatorInviteCode(): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

async function isCodeAvailable(code: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'creatorClaimCodes', code));
  return !snap.exists();
}

/** Allocate a unique 8-char code for creatorClaimCodes/{code}. */
export async function allocateCreatorInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generateCreatorInviteCode();
    if (await isCodeAvailable(code)) return code;
  }
  throw new Error('Could not allocate a unique creator invite code');
}

export type ParsedRosterRow = {
  id: string;
  name: string;
  handle: string;
  platform: string;
  channels: Array<{
    platform: string;
    handle: string;
    url: string;
    followers: number;
    genre: string;
  }>;
  niche?: string;
  contentGenre?: string;
  followers?: number;
  category?: string;
  subcategory?: string;
  rate: number;
  minimumRate?: number;
  location?: string;
  email?: string;
};

const BATCH_CAP = 400;

function randProfileId(rowId: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${rowId}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Creates `influencerRosters` doc (with influencer summary incl. profileId + claimCode),
 * parallel `creatorProfiles` + `creatorClaimCodes`. Chunked commits.
 */
export async function writeRosterInventory(args: {
  rosterPayload: Record<string, unknown>;
  influencers: ParsedRosterRow[];
  managerUid: string;
}): Promise<{ rosterId: string }> {
  const rosterRef = doc(collection(db, 'influencerRosters'));
  const rosterId = rosterRef.id;

  const influencerSummaries: Array<Record<string, unknown>> = [];

  let batch = writeBatch(db);
  let opsInBatch = 0;

  const flush = async () => {
    if (opsInBatch === 0) return;
    await batch.commit();
    batch = writeBatch(db);
    opsInBatch = 0;
  };

  const pushOp = async () => {
    opsInBatch += 1;
    if (opsInBatch >= BATCH_CAP) await flush();
  };

  for (const row of args.influencers) {
    const profileId = randProfileId(row.id);
    const code = await allocateCreatorInviteCode();
    const categories = row.category ? [row.category] : [];
    const subcategories = row.subcategory ? [row.subcategory] : [];

    const channels =
      row.channels?.length > 0
        ? row.channels
        : [
            {
              platform: row.platform || 'Instagram',
              handle: row.handle || '',
              url: '',
              followers: row.followers || 0,
              genre: row.contentGenre || row.niche || '',
            },
          ];

    const profileDoc = {
      managerId: args.managerUid,
      rosterId,
      rosterRowId: row.id,
      claimCode: code,
      status: 'unclaimed' as const,
      claimedByUid: null as string | null,
      claimedAt: null as null,
      name: row.name,
      email: row.email || '',
      location: row.location || '',
      channels,
      niche: row.niche || '',
      contentGenre: row.contentGenre || row.niche || '',
      followers: row.followers || channels[0]?.followers || 0,
      rate: row.rate || row.minimumRate || 0,
      minimumRate: row.minimumRate ?? row.rate ?? 0,
      categories,
      subcategories,
      visibility: 'marketplace',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    batch.set(doc(db, 'creatorProfiles', profileId), profileDoc);
    await pushOp();

    batch.set(doc(db, 'creatorClaimCodes', code), {
      code,
      profileId,
      managerId: args.managerUid,
      rosterId,
      createdAt: serverTimestamp(),
    });
    await pushOp();

    influencerSummaries.push({
      profileId,
      claimCode: code,
      id: row.id,
      name: row.name,
      handle: row.handle,
      platform: row.platform,
      channels,
      niche: row.niche,
      contentGenre: row.contentGenre,
      followers: profileDoc.followers,
      rate: profileDoc.rate,
      minimumRate: profileDoc.minimumRate,
      location: row.location,
      email: row.email,
      category: row.category,
      subcategory: row.subcategory,
    });
  }

  batch.set(rosterRef, {
    ...args.rosterPayload,
    influencers: influencerSummaries,
    createdAt: serverTimestamp(),
  });
  opsInBatch += 1;
  await flush();

  return { rosterId };
}
