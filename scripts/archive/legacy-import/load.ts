// Puts the transformed items (out/items.json) and their downloaded images (data/images/) into the
// database. Run users.ts --commit first, so the accounts exist. Sends no mails.
//
//   npm run import:load               dry run: shows what would happen, writes nothing
//   npm run import:load -- --commit   creates categories, items and images
//
// Safe to run again: every item put in is recorded in out/loaded-<project>.json (old id → new id,
// one file per database), so a new run skips it, and only uploads images that are still missing. Images are scaled down and saved
// as JPEG like uploads on the site (max 1600px, camera data such as GPS position removed).
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { normalizeCategoryName, sameCategory } from "../../../lib/category-name";
import { newExpiryDate } from "../../../lib/item-expiry";
import { createAdminClient } from "../../../lib/supabase/admin";
import type { OutItem } from "./transform";

const DATA = join(process.cwd(), "scripts/archive/legacy-import/data");
// One state file per Supabase project, so a run against production doesn't skip what the test
// database already has.
const PROJECT = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
const STATE_FILE = join(DATA, `out/loaded-${PROJECT}.json`);
const IMAGE_BUCKET = "item-images";
const COMMIT = process.argv.includes("--commit");

type Admin = ReturnType<typeof createAdminClient>;
type Loaded = Record<string, { itemId: string; images: number }>;
type ManifestEntry = { legacyId: string; url: string; file: string | null; error?: string };

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
const state: Loaded = existsSync(STATE_FILE) ? readJson(STATE_FILE) : {};
const saveState = () => writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));

async function userIdsByEmail(supabase: Admin) {
  const ids = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) ids.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) return ids;
  }
}

// Category name → id, creating the ones that don't exist yet (Briller, Paraplyer, ...).
async function categoryIds(supabase: Admin, names: string[]) {
  const { data, error } = await supabase.from("categories").select("id, name").returns<{ id: number; name: string }[]>();
  if (error) throw error;
  const ids = new Map<string, number>();
  const missing: string[] = [];
  for (const raw of new Set(names)) {
    const name = normalizeCategoryName(raw);
    const found = data.find((c) => sameCategory(c.name, name));
    if (found) ids.set(raw, found.id);
    else missing.push(name);
  }
  console.log(`Kategorier: ${ids.size} findes, ${missing.length} nye${missing.length ? `: ${missing.join(", ")}` : ""}.`);
  if (COMMIT) {
    for (const name of missing) {
      const { data: created, error: insertError } = await supabase
        .from("categories")
        .insert({ name })
        .select("id")
        .single<{ id: number }>();
      if (insertError) throw insertError;
      ids.set(name, created.id);
    }
  }
  return (raw: string) => ids.get(raw) ?? ids.get(normalizeCategoryName(raw));
}

// Scaled down to max 1600px and saved as JPEG, like uploads on the site. sharp drops the camera
// metadata. HEIC that sharp can't read is converted with macOS' sips first.
async function toJpeg(path: string) {
  const prepare = (input: string) =>
    sharp(input)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  try {
    return await prepare(path);
  } catch (error) {
    if (!/\.hei[cf]$/i.test(path)) throw error;
    const dir = mkdtempSync(join(tmpdir(), "heic-"));
    try {
      const out = join(dir, "image.jpg");
      execFileSync("sips", ["-s", "format", "jpeg", path, "--out", out], { stdio: "ignore" });
      return await prepare(out);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

// An item already in the database from an earlier run that lost its state (same title, type and
// creation time), so it isn't put in twice.
async function findExisting(supabase: Admin, item: OutItem) {
  if (!item.createdAt) return null;
  const { data } = await supabase
    .from("items")
    .select("id")
    .eq("title", item.title)
    .eq("type", item.type)
    .eq("created_at", item.createdAt)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

async function main() {
  console.log(COMMIT ? "Kører med --commit: skriver til databasen." : "Prøvekørsel: skriver intet. Tilføj --commit for at køre.");
  console.log(`Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  const items = readJson<OutItem[]>(join(DATA, "out/items.json"));
  const manifest = readJson<ManifestEntry[]>(join(DATA, "images/manifest.json"));
  const imagesFor = (legacyId: string) => manifest.filter((m) => m.legacyId === legacyId && m.file && !m.error);

  const supabase = createAdminClient();
  const users = await userIdsByEmail(supabase);
  const missingOwners = [...new Set(items.filter((i) => i.ownerEmail && !users.has(i.ownerEmail)).map((i) => i.ownerEmail))];
  if (missingOwners.length) {
    console.log(`⚠ ${missingOwners.length} ejere findes ikke som brugere endnu. Kør først: npm run import:users -- --commit`);
    if (COMMIT) process.exit(1);
  }
  const categoryId = await categoryIds(supabase, items.map((i) => i.category));
  const expiresAt = newExpiryDate();

  const todo = items.filter((i) => !state[i.legacyId] || state[i.legacyId].images < imagesFor(i.legacyId).length);
  console.log(`Opslag: ${items.length}. Allerede indlæst: ${items.length - todo.length}. Mangler: ${todo.length}.`);
  console.log(`Billeder: ${manifest.filter((m) => !m.error).length}. Udløb for nye opslag: ${expiresAt.slice(0, 10)}.`);
  if (!COMMIT) return;

  let createdItems = 0;
  let uploaded = 0;
  const problems: string[] = [];

  for (const [n, item] of todo.entries()) {
    const userId = item.ownerEmail ? users.get(item.ownerEmail)! : null;
    let entry = state[item.legacyId];

    if (!entry) {
      const existing = await findExisting(supabase, item);
      if (existing) {
        entry = state[item.legacyId] = { itemId: existing, images: 0 };
      } else {
        const category = categoryId(item.category);
        if (!category) {
          problems.push(`opslag ${item.legacyId}: kategorien "${item.category}" findes ikke`);
          continue;
        }
        const { data, error } = await supabase
          .from("items")
          .insert({
            user_id: userId,
            contact_email: userId ? null : item.contactEmail,
            category_id: category,
            type: item.type,
            title: item.title,
            description: item.description,
            status: item.status,
            address: item.place.address,
            postal_code: item.place.postalCode,
            city: item.place.city,
            municipality: item.place.municipality,
            region: item.place.region,
            latitude: item.place.latitude,
            longitude: item.place.longitude,
            location_exact: false, // town-level only: shown as an area on the map
            occurred_at: item.occurredAt,
            created_at: item.createdAt ?? undefined,
            expires_at: expiresAt,
          })
          .select("id")
          .single<{ id: string }>();
        if (error) {
          problems.push(`opslag ${item.legacyId}: ${error.message}`);
          continue;
        }
        entry = state[item.legacyId] = { itemId: data.id, images: 0 };
        createdItems++;
      }
      saveState();
    }

    for (const image of imagesFor(item.legacyId).slice(entry.images)) {
      try {
        const body = await toJpeg(join(DATA, "images", image.legacyId, image.file!));
        const path = `${userId ?? "guest"}/${entry.itemId}/${randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, body, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        const fileName = image.file!.replace(/^\d+-/, "").replace(/\.[^.]+$/, ".jpg");
        const { error: rowError } = await supabase
          .from("item_images")
          .insert({ item_id: entry.itemId, file_path: path, file_name: fileName });
        if (rowError) {
          await supabase.storage.from(IMAGE_BUCKET).remove([path]);
          throw rowError;
        }
        entry.images++;
        uploaded++;
        saveState();
      } catch (error) {
        problems.push(`billede ${image.file} på opslag ${item.legacyId}: ${(error as Error).message}`);
        break; // keep the order: try this item's images again on the next run
      }
    }
    if ((n + 1) % 50 === 0) console.log(`  ${n + 1}/${todo.length}`);
  }

  console.log(`\nFærdig: ${createdItems} opslag oprettet, ${uploaded} billeder uploadet.`);
  if (problems.length) {
    console.log(`${problems.length} problemer (kør igen for at prøve dem igen):`);
    for (const p of problems) console.log(`  ✗ ${p}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
