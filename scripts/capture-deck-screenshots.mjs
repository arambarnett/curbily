#!/usr/bin/env node
/**
 * Screenshots each /investment slide (chromeless mode) and merges PNGs into one PDF.
 *
 * Prereqs: npm install ; npx playwright install chromium
 * Serve the built app first, e.g.:
 *   npm run build && npx vite preview --host 127.0.0.1 --port 4178
 *
 * Then:
 *   DECK_PREVIEW_URL=http://127.0.0.1:4178 npm run deck:screenshot-pdf
 */

import { chromium } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = (process.env.DECK_PREVIEW_URL ?? 'http://127.0.0.1:4178').replace(/\/$/, '');
const OUT =
  process.env.OUT_PDF ?? path.join(os.homedir(), 'Downloads', 'Curbily-investment-deck-screenshots.pdf');
const VIEW_W = Number(process.env.DECK_VIEWPORT_W ?? 1600);
const VIEW_H = Number(process.env.DECK_VIEWPORT_H ?? 900);

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'curbily-deck-cap-'));
  const pngPaths = [];

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: VIEW_W, height: VIEW_H },
    deviceScaleFactor: 2,
  });

  try {
    await page.goto(`${BASE}/investment?chromeless=1`, {
      waitUntil: 'networkidle',
      timeout: 120_000,
    });
    await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());

    const count = await page.locator('button[aria-label^="Go to slide"]').count();
    if (!count) throw new Error('No deck pagination found — is /investment loading?');

    for (let i = 0; i < count; i++) {
      await page.goto(`${BASE}/investment?chromeless=1&slide=${i}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await page.waitForSelector('#deck-slide-capture-root', { timeout: 30_000 });
      await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
      await page.waitForTimeout(400);

      const file = path.join(tmpDir, `slide-${String(i).padStart(3, '0')}.png`);
      await page.locator('#deck-slide-capture-root').screenshot({ path: file });
      pngPaths.push(file);
      process.stderr.write(`Captured slide ${i + 1}/${count}\n`);
    }

    const pdfDoc = await PDFDocument.create();
    for (const pngPath of pngPaths) {
      const bytes = fs.readFileSync(pngPath);
      const image = await pdfDoc.embedPng(bytes);
      const w = image.width;
      const h = image.height;
      const pdfPage = pdfDoc.addPage([w, h]);
      pdfPage.drawImage(image, { x: 0, y: 0, width: w, height: h });
    }

    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, pdfBytes);
    process.stderr.write(`Wrote ${OUT}\n`);
  } finally {
    await browser.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
