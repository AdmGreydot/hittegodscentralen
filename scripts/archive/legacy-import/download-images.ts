// Downloads the images of the items to import from the old site, so they're kept locally before
// the domain moves. Reads out/items.json (from transform.ts) and saves to data/images/<old item
// id>/. Only reads from the old site and writes files: no database, no mails.
//
//   npm run import:images
//
// Safe to run again: images already downloaded are skipped. data/images/manifest.json lists every
// image with its local file, or the error if it couldn't be fetched.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { OutItem } from "./transform";

const DATA = join(process.cwd(), "scripts/archive/legacy-import/data");
const IMAGES = join(DATA, "images");
const MANIFEST = join(IMAGES, "manifest.json");
// Only images from the old site; anything else in the export is left alone.
const ALLOWED_HOST = "hittegodscentralen.dk";
const CONCURRENCY = 3;
const MAX_BYTES = 25 * 1024 * 1024;

type Entry = { legacyId: string; url: string; file: string | null; bytes?: number; error?: string };

// "image-5.jpg" → "0-image-5.jpg": the index keeps the order and avoids clashes between items.
function localName(url: string, index: number) {
  const name = decodeURIComponent(basename(new URL(url).pathname)).replace(/[^\p{L}\p{N}._-]/gu, "_");
  return `${index}-${name}`;
}

async function download(entry: Entry): Promise<Entry> {
  const url = new URL(entry.url);
  if (url.hostname.replace(/^www\./, "") !== ALLOWED_HOST) return { ...entry, file: null, error: `andet domæne: ${url.hostname}` };
  const file = join(IMAGES, entry.legacyId, entry.file!);
  if (existsSync(file) && statSync(file).size > 0) return { ...entry, bytes: statSync(file).size };

  try {
    const res = await fetch(entry.url, {
      headers: { "User-Agent": "Hittegodscentralen-import/1.0 (info@hittegodscentralen.dk)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ...entry, file: null, error: `HTTP ${res.status}` };
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/") && !/\.hei[cf]$/i.test(entry.url)) {
      return { ...entry, file: null, error: `ikke et billede (${type || "ukendt type"})` };
    }
    const body = Buffer.from(await res.arrayBuffer());
    if (!body.length) return { ...entry, file: null, error: "tom fil" };
    if (body.length > MAX_BYTES) return { ...entry, file: null, error: `for stor (${body.length} bytes)` };
    mkdirSync(join(IMAGES, entry.legacyId), { recursive: true });
    writeFileSync(file, body);
    return { ...entry, bytes: body.length };
  } catch (error) {
    return { ...entry, file: null, error: (error as Error).message };
  }
}

async function main() {
  const items = JSON.parse(readFileSync(join(DATA, "out/items.json"), "utf8")) as OutItem[];
  const entries: Entry[] = items.flatMap((item) =>
    item.images.map((url, i) => ({ legacyId: item.legacyId, url, file: localName(url, i) })),
  );
  console.log(`Henter ${entries.length} billeder fra ${items.filter((i) => i.images.length).length} opslag...`);

  const results: Entry[] = [];
  let next = 0;
  async function worker() {
    while (next < entries.length) {
      const entry = entries[next++];
      const result = await download(entry);
      results.push(result);
      if (result.error) console.warn(`  ✗ opslag ${result.legacyId}: ${result.error}`);
      if (results.length % 25 === 0) console.log(`  ${results.length}/${entries.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  mkdirSync(IMAGES, { recursive: true });
  results.sort((a, b) => a.legacyId.localeCompare(b.legacyId) || a.url.localeCompare(b.url));
  writeFileSync(MANIFEST, JSON.stringify(results, null, 2));

  const ok = results.filter((r) => !r.error);
  const mb = ok.reduce((n, r) => n + (r.bytes ?? 0), 0) / 1024 / 1024;
  console.log(`Færdig: ${ok.length} hentet (${mb.toFixed(1)} MB), ${results.length - ok.length} fejlede.`);
  console.log(`Liste: ${MANIFEST}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
