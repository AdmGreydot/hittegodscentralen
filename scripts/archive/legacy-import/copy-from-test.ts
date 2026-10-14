// Copies the imported legacy items, with their images, from the test database (.env.local) to
// production (.env.production). For when the production run of load.ts stopped partway and the
// downloaded images were gone. Sends no mails.
//
//   npx tsx --conditions=react-server scripts/archive/legacy-import/copy-from-test.ts            dry run
//   npx tsx --conditions=react-server scripts/archive/legacy-import/copy-from-test.ts --commit   copies
//
// An item counts as legacy when its title, type and creation time match a post in the WordPress
// export (the hg-posts_*.json files in data/), so items made while testing are left out. Safe to
// run again: items already in production (same title, type and creation time) are not put in
// twice, but get the images they're missing.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { normalizeCategoryName, sameCategory } from "../../../lib/category-name";
import { newExpiryDate } from "../../../lib/item-expiry";

const DATA = join(process.cwd(), "scripts/archive/legacy-import/data");
const EXPORT_FILES = ["hg-posts_users-2026-10-14.json", "hg-posts_guest-2026-10-14.json"];
const IMAGE_BUCKET = "item-images";
const COMMIT = process.argv.includes("--commit");

type Admin = ReturnType<typeof client>;
type Item = Record<string, unknown> & {
  id: string;
  user_id: string | null;
  contact_email: string | null;
  category_id: number;
  type: string;
  title: string;
  status: string;
  created_at: string;
};
type Image = { item_id: string; file_path: string; file_name: string | null; created_at: string };

function client(envFile: string) {
  const env = parseEnv(readFileSync(join(process.cwd(), envFile), "utf8"));
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// The same cleaning of title and date as transform.ts, so the keys match what was imported.
function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
const str = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const key = (title: string, type: string, createdAt: string) => `${title}\u0000${type}\u0000${new Date(createdAt).toISOString()}`;

function legacyKeys() {
  const keys = new Set<string>();
  for (const file of EXPORT_FILES) {
    for (const line of readFileSync(join(DATA, file), "utf8").split("\n")) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      const typeMeta = row["meta._hittegods_type"];
      const type = str(Array.isArray(typeMeta) ? typeMeta[0] : typeMeta);
      const date = str(row.post_date_gmt);
      if (!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(date)) continue;
      keys.add(key(decodeEntities(str(row.post_title)).slice(0, 100), type, `${date.replace(" ", "T")}Z`));
    }
  }
  return keys;
}

async function all<T>(supabase: Admin, table: string, columns: string) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order("id").range(from, from + 999);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < 1000) return rows;
  }
}

async function emailsById(supabase: Admin) {
  const map = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) map.set(u.id, u.email.toLowerCase());
    if (data.users.length < 1000) return map;
  }
}

async function main() {
  console.log(COMMIT ? "Kører med --commit: skriver til produktion." : "Prøvekørsel: skriver intet. Tilføj --commit for at køre.");
  const source = client(".env.local");
  const target = client(".env.production");
  const [from, to] = [".env.local", ".env.production"].map(
    (file) => new URL(parseEnv(readFileSync(join(process.cwd(), file), "utf8")).NEXT_PUBLIC_SUPABASE_URL!).host,
  );
  console.log(`Fra: ${from}\nTil: ${to}\n`);
  if (from === to) throw new Error("Kilde og mål er samme database");

  const keys = legacyKeys();
  const [sourceItems, targetItems, sourceImages, targetImages, sourceCats, targetCats, sourceUsers, targetUsers] =
    await Promise.all([
      all<Item>(source, "items", "*"),
      all<Item>(target, "items", "id, type, title, created_at"),
      all<Image>(source, "item_images", "item_id, file_path, file_name, created_at"),
      all<Image>(target, "item_images", "item_id, file_path, file_name, created_at"),
      all<{ id: number; name: string }>(source, "categories", "id, name"),
      all<{ id: number; name: string }>(target, "categories", "id, name"),
      emailsById(source),
      emailsById(target),
    ]);
  const targetUserIds = new Map([...targetUsers].map(([id, email]) => [email, id]));
  const targetByKey = new Map(targetItems.map((i) => [key(i.title, i.type, i.created_at), i.id]));
  const imagesOf = (images: Image[], itemId: string) =>
    images.filter((i) => i.item_id === itemId).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const legacy = sourceItems.filter((i) => keys.has(key(i.title, i.type, i.created_at)));
  const toCreate = legacy.filter((i) => !targetByKey.has(key(i.title, i.type, i.created_at)));
  const missingImages = (i: Item) => {
    const existing = targetByKey.get(key(i.title, i.type, i.created_at));
    return imagesOf(sourceImages, i.id).length - (existing ? imagesOf(targetImages, existing).length : 0);
  };
  const ownerEmail = (i: Item) => (i.user_id ? sourceUsers.get(i.user_id) : undefined);
  const noAccount = toCreate.filter((i) => ownerEmail(i) && !targetUserIds.has(ownerEmail(i)!));

  console.log(`Opslag i test: ${sourceItems.length}, heraf fra den gamle side: ${legacy.length}.`);
  console.log(`Findes allerede i produktion: ${legacy.length - toCreate.length}. Kopieres: ${toCreate.length}.`);
  console.log(`Billeder at kopiere: ${legacy.reduce((n, i) => n + Math.max(0, missingImages(i)), 0)}.`);
  const statuses = toCreate.reduce<Record<string, number>>((m, i) => ((m[i.status] = (m[i.status] ?? 0) + 1), m), {});
  console.log(`Status på dem, der kopieres: ${JSON.stringify(statuses)}.`);
  if (noAccount.length) {
    console.log(`⚠ ${noAccount.length} opslag har en ejer uden konto i produktion; de lægges ind uden konto med ejerens e-mail.`);
  }

  // Category id in test → id in production, creating the ones production doesn't have.
  const categoryIds = new Map<number, number>();
  const newCategories = new Set<string>();
  for (const id of new Set(toCreate.map((i) => i.category_id))) {
    const name = normalizeCategoryName(sourceCats.find((c) => c.id === id)!.name);
    const found = targetCats.find((c) => sameCategory(c.name, name));
    if (found) categoryIds.set(id, found.id);
    else newCategories.add(name);
  }
  if (newCategories.size) console.log(`Nye kategorier i produktion: ${[...newCategories].join(", ")}.`);
  if (!COMMIT) return;

  for (const id of new Set(toCreate.map((i) => i.category_id))) {
    if (categoryIds.has(id)) continue;
    const name = normalizeCategoryName(sourceCats.find((c) => c.id === id)!.name);
    const { data, error } = await target.from("categories").insert({ name }).select("id").single<{ id: number }>();
    if (error) throw error;
    categoryIds.set(id, data.id);
  }

  const expiresAt = newExpiryDate();
  const problems: string[] = [];
  let createdItems = 0;
  let uploaded = 0;

  for (const [n, item] of legacy.entries()) {
    let itemId = targetByKey.get(key(item.title, item.type, item.created_at));
    if (!itemId) {
      const email = ownerEmail(item);
      const userId = email ? targetUserIds.get(email) ?? null : null;
      // Everything but the ids, which differ between the databases, and the bookkeeping columns.
      const {
        id: _id, user_id: _user, category_id: _category, updated_at: _updated, status_changed_at: _changed,
        resolved_conversation_id: _conversation, expires_at: _expires, expiry_warned_at: _warned,
        ...rest
      } = item;
      const { data, error } = await target
        .from("items")
        .insert({
          ...rest,
          user_id: userId,
          contact_email: userId ? null : (item.contact_email ?? email ?? null),
          category_id: categoryIds.get(item.category_id),
          expires_at: expiresAt,
        })
        .select("id")
        .single<{ id: string }>();
      if (error) {
        problems.push(`"${item.title}": ${error.message}`);
        continue;
      }
      itemId = data.id;
      targetByKey.set(key(item.title, item.type, item.created_at), itemId);
      createdItems++;
    }

    const { data: owner } = await target.from("items").select("user_id").eq("id", itemId).single<{ user_id: string | null }>();
    const have = imagesOf(targetImages, itemId).length;
    for (const image of imagesOf(sourceImages, item.id).slice(have)) {
      try {
        const { data: blob, error: downloadError } = await source.storage.from(IMAGE_BUCKET).download(image.file_path);
        if (downloadError) throw downloadError;
        const path = `${owner?.user_id ?? "guest"}/${itemId}/${randomUUID()}.jpg`;
        const { error: uploadError } = await target.storage
          .from(IMAGE_BUCKET)
          .upload(path, await blob.arrayBuffer(), { contentType: blob.type || "image/jpeg" });
        if (uploadError) throw uploadError;
        const { error: rowError } = await target
          .from("item_images")
          .insert({ item_id: itemId, file_path: path, file_name: image.file_name });
        if (rowError) {
          await target.storage.from(IMAGE_BUCKET).remove([path]);
          throw rowError;
        }
        uploaded++;
      } catch (error) {
        problems.push(`billede på "${item.title}": ${(error as Error).message}`);
        break; // keep the order: try this item's images again on the next run
      }
    }
    if ((n + 1) % 50 === 0) console.log(`  ${n + 1}/${legacy.length}`);
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
