// Turns the WordPress export of the old Hittegodscentralen (three JSON Lines files in
// scripts/archive/legacy-import/data/) into clean files that match the new database, in scripts/archive/legacy-import/data/out/.
// Only reads the export and writes files: nothing is sent to the database and no mails go out.
//
//   npm run import:transform
//
// Output:
//   out/users.json   one row per account to create (read by users.ts)
//   out/items.json   one row per item to import, with category, place and image URLs
//   out/report.md    what was skipped and why, category and place results to look through
//
// Places are looked up by town name with Nominatim (OpenStreetMap), at most 1 per second as its
// rules require. Results are cached in data/geocode-cache.json, so later runs are fast.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeCategoryName } from "../../../lib/category-name";
import { municipalityName } from "../../../lib/geo";

const DATA = join(process.cwd(), "scripts/archive/legacy-import/data");
const OUT = join(DATA, "out");
const FILES = {
  users: "hg-users-2026-10-14.json",
  userPosts: "hg-posts_users-2026-10-14.json",
  guestPosts: "hg-posts_guest-2026-10-14.json",
};
const GEOCODE_CACHE = join(DATA, "geocode-cache.json");

// Only items created this recently are imported, and only users active in the same period.
const MONTHS_BACK = 6;
const CUTOFF = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - MONTHS_BACK);
  return d.toISOString();
})();

// People behind Hittegodscentralen and test accounts. Neither they nor their items are imported.
const EXCLUDED_LOGINS = ["admin", "ju.rauchfuss", "roland", "karoline.b.l", "julian"];
const INTERNAL_DOMAINS = ["greydot.dk", "hittegodscentralen.dk", "hittegodsportalen.dk"];

const isInternalEmail = (address: string) => INTERNAL_DOMAINS.includes(address.split("@")[1] ?? "");
// Old item ids not to import (tests, spam), one per line. "#" starts a comment.
const EXCLUDE_FILE = join(DATA, "exclude.txt");

function readExcludeList() {
  if (!existsSync(EXCLUDE_FILE)) return new Set<string>();
  return new Set(
    readFileSync(EXCLUDE_FILE, "utf8")
      .split("\n")
      .map((line) => line.replace(/#.*/, "").trim())
      .filter(Boolean),
  );
}

// Titles that look like tests or spam, listed in the report so they can go in exclude.txt.
function looksSuspicious(title: string) {
  return (
    title.length < 3 ||
    !/[aeiouyæøå]/i.test(title) || // no vowels at all
    /[bcdfghjklmnpqrstvwxz]{5,}/i.test(title) || // keyboard mashing like "msntdwxopk"
    /hittegodscentralen|\btest\b|asdf/i.test(title)
  );
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Row = Record<string, unknown>;

function readJsonLines(file: string): Row[] {
  return readFileSync(join(DATA, file), "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

// WordPress keeps meta values as lists; the first value is the one in use.
function meta(row: Row, key: string) {
  const value = row[`meta.${key}`];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
}

function str(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function firstOf(...values: string[]) {
  return values.find((v) => v.trim()) ?? "";
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function email(value: string) {
  const e = value.trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : "";
}

// "2026-01-27 13:26:21" (GMT) as an ISO timestamp.
function gmt(value: unknown) {
  const s = str(value);
  return /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(s) ? `${s.replace(" ", "T")}Z` : null;
}

// --- Users -----------------------------------------------------------------------------------

export type OutUser = {
  legacyId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string; // customer, subscriber, administrator
  accountType: string | null; // business, private or unknown
  registeredAt: string | null;
  lastLoginAt: string | null;
  emailConsent: boolean;
  postCount: number;
};

// All users who could be imported, plus the ids and e-mails of the excluded ones (so their items
// can be left out too). Who is actually imported depends on the items: see main().
function transformUsers(rows: Row[], skipped: Skip[]) {
  const users: OutUser[] = [];
  const excludedIds = new Set<string>();
  const excludedEmails = new Set<string>();
  const seen = new Set<string>();
  for (const row of rows) {
    const legacyId = String(row.id);
    const address = email(str(row.user_email));
    if (EXCLUDED_LOGINS.includes(str(row.user_login).toLowerCase()) || (address && isInternalEmail(address))) {
      excludedIds.add(legacyId);
      if (address) excludedEmails.add(address);
      skipped.push({ file: "users", legacyId, reason: "intern konto eller testkonto" });
      continue;
    }
    if (!address) {
      skipped.push({ file: "users", legacyId, reason: "ugyldig e-mail" });
      continue;
    }
    if (seen.has(address)) {
      skipped.push({ file: "users", legacyId, reason: "e-mail findes allerede på en anden bruger" });
      continue;
    }
    seen.add(address);
    // display_name is mostly the login name, so the real name comes from fornavn/efternavn.
    const fullName = firstOf(`${str(row.fornavn)} ${str(row.efternavn)}`.trim(), str(row.display_name));
    users.push({
      legacyId,
      email: address,
      fullName,
      phone: firstOf(str(row.telefon), meta(row, "phone")) || null,
      role: (Array.isArray(row.roller) ? String(row.roller[0] ?? "") : "") || "customer",
      accountType: meta(row, "_hg_account_type") || null,
      registeredAt: gmt(row.user_registered),
      lastLoginAt: gmt(row.sidste_login),
      emailConsent: meta(row, "_hg_email_consent") === "1",
      postCount: Number(row.antal_opslag) || 0,
    });
  }
  return { users, excludedIds, excludedEmails };
}

// --- Categories ------------------------------------------------------------------------------

// Old category → new one. The seven first ones exist already; the rest are created on import.
const CATEGORY_MAP: Record<string, string> = {
  Bilnøgler: "Nøgler",
  Nøgler: "Nøgler",
  Elektronik: "Elektronik",
  Mobiltelefoner: "Elektronik",
  Headsets: "Elektronik",
  Armbånd: "Smykker",
  Halskæder: "Smykker",
  Huer: "Tøj",
  Beklædning: "Tøj",
  Sko: "Tøj",
  Rygsække: "Tasker",
  Håndtasker: "Tasker",
  Punge: "Punge",
  Cykler: "Cykler",
  Diverse: "Andet",
};

// For items without a category: first rule that matches the title or description wins. The order
// matters: "iPhone med sygesikringskort" is Elektronik, "taske med sølvspænde" is Tasker.
const CATEGORY_RULES: [RegExp, string][] = [
  [/nøgle|\bkey|nøglebundt|nøglering/i, "Nøgler"],
  [/pung|tegnebog|tegenebog|portemon|kortholder|kort-?etui|wallet/i, "Punge"],
  [/iphone|ipone|\bphone|telefon|mobil|samsung|huawei|honor|airpods?|høretelefon|headset|earbuds|ipad|tablet|computer|bærbar|\bpc\b|laptop|macbook|lenovo?|asus|oplader|kamera|smartwatch|smart ?watch|apple watch|powerbank|jbl|bose|sony|beoplay|airtag|router|usb|soundbox|høreap+[ae]r+at|høresnegl|massagepistol/i, "Elektronik"],
  [/taske|rygsæk|kuffert|mulepose|duffel|lædermappe/i, "Tasker"],
  [/briller|solbrille/i, "Briller"],
  [/paraply/i, "Paraplyer"],
  [/\bring\b|ringe\b|halskæde|armbånd|ørering|smykke|vielsesring|\bur\b|armbåndsur|\buhr\b/i, "Smykker"],
  [/\b(pas|kørekort|sygesikring|id-?kort|identity card|studiekort|dokument|kredit ?kort|dankort|visa|rejsekort|buskort|togkort)|pensionist.{0,15}kort/i, "Dokumenter"],
  [/cykel|ladcykel|løbehjul/i, "Cykler"],
  [/bamse|kanin|nusseklud|legetøj|doudou|brætspil|\bdukke/i, "Legetøj"],
  [/jakke|frakke|\bhue\b|\bhat\b|bøllehat|stråhat|baret|kasket|trøje|sweater|sweatshirt|cardigan|\bsko\b|sandal|støvle|tørklæde|bandana|vante|handske|bluse|bukser|bælte|\bvest\b|regnslag|kjole|badetøj|svømmetøj|flyverdragt|\bfez\b/i, "Tøj"],
];

function categoryFor(row: Row, title: string, description: string) {
  const old = Array.isArray(row.kategorier) ? String(row.kategorier[0] ?? "") : "";
  if (old) return { category: CATEGORY_MAP[old] ?? normalizeCategoryName(old), how: "gammel kategori" };
  if (meta(row, "_hittegods_is_key") === "yes") return { category: "Nøgler", how: "markeret som nøgle" };
  const text = `${title} ${description}`;
  const rule = CATEGORY_RULES.find(([re]) => re.test(text));
  return rule ? { category: rule[1], how: "gættet ud fra tekst" } : { category: "Andet", how: "ingen match" };
}

// --- Places ----------------------------------------------------------------------------------

type Place = {
  city: string | null;
  postalCode: string | null;
  municipality: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
};
type GeocodeCache = Record<string, Place | null>;

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Hittegodscentralen-import/1.0 (info@hittegodscentralen.dk)";
let lastRequest = 0;

async function geocode(query: string, cache: GeocodeCache): Promise<Place | null> {
  const key = query.toLowerCase();
  if (key in cache) return cache[key];

  const wait = 1100 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();

  const postal = query.match(/^postnummer:(\d{4})$/);
  const params = new URLSearchParams({
    ...(postal ? { postalcode: postal[1] } : { q: query }),
    countrycodes: "dk",
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    "accept-language": "da",
  });
  let place: Place | null = null;
  try {
    const res = await fetch(`${NOMINATIM}?${params}`, { headers: { "User-Agent": USER_AGENT } });
    const [hit] = res.ok ? ((await res.json()) as { lat: string; lon: string; address?: Record<string, string> }[]) : [];
    const a = hit?.address;
    if (a && a.country_code === "dk") {
      place = {
        city: a.city ?? a.town ?? a.village ?? a.suburb ?? a.hamlet ?? null,
        postalCode: a.postcode && /^\d{4}$/.test(a.postcode) ? a.postcode : null,
        municipality: municipalityName(a.municipality),
        region: a.state ?? null,
        latitude: Number(hit.lat),
        longitude: Number(hit.lon),
      };
    }
  } catch (error) {
    console.warn(`  Opslag fejlede for "${query}":`, (error as Error).message);
    return null; // not cached, so the next run tries again
  }
  cache[key] = place;
  return place;
}

// Misspellings and nicknames seen in the export.
const TOWN_ALIASES: Record<string, string> = {
  aarhis: "Aarhus",
  skanerborg: "Skanderborg",
  købehavn: "København",
  kbh: "København",
  "kogens nytorv": "Kongens Nytorv, København",
  "københavns området": "København",
  "nørreport omegn": "Nørreport, København",
  metro: "København", // the Copenhagen metro
  "s-toget": "København",
  aabyhøj: "Åbyhøj",
};

// Town names that have been found before (from the cache), to spot a town inside free text
// like "glemt i bus 6A mellem Nørreport og ...".
const knownTowns = new Set<string>();

function containsWord(text: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "iu").test(text);
}

// What to look up for a free-text place, best guess first: a postal code in the text ("3520
// Farum"), the whole text, its first part ("Aarhus - Vejle" → "Aarhus"), a known misspelling,
// then the longest known town name found somewhere in the text.
function placeQueries(town: string) {
  const queries: string[] = [];
  const postal = town.match(/\b([1-9]\d{3})\b/);
  if (postal) queries.push(`postnummer:${postal[1]}`);
  queries.push(town, town.split(/[,/(]| - | og | eller /)[0].trim());
  for (const [alias, name] of Object.entries(TOWN_ALIASES)) {
    if (containsWord(town, alias)) queries.push(name);
  }
  const inText = [...knownTowns].filter((t) => t.length >= 4 && containsWord(town, t));
  queries.push(...inText.sort((a, b) => b.length - a.length));
  return [...new Set(queries.filter((q) => q.length >= 2 && q.length <= 60))];
}

// --- Items -----------------------------------------------------------------------------------

export type OutItem = {
  legacyId: string;
  source: "user" | "guest";
  ownerEmail: string | null; // the account it belongs to (users.json), or null
  contactEmail: string | null; // for items without an account
  type: "lost" | "found";
  status: "active" | "resolved";
  title: string;
  description: string | null;
  category: string;
  categoryHow: string;
  occurredAt: string; // noon UTC on the day, like the wizard
  createdAt: string | null;
  place: Place & { address: string | null; raw: string; matchedOn: string | null };
  images: string[];
};

type Skip = { file: string; legacyId: string; reason: string };

async function transformItems(
  rows: Row[],
  source: "user" | "guest",
  exclude: Set<string>,
  usersById: Map<string, OutUser>,
  userEmails: Set<string>,
  excluded: { ids: Set<string>; emails: Set<string> },
  cache: GeocodeCache,
  skipped: Skip[],
) {
  const file = source === "user" ? "posts_users" : "posts_guest";
  const items: OutItem[] = [];

  for (const row of rows) {
    const legacyId = String(row.id);
    if (exclude.has(legacyId)) {
      skipped.push({ file, legacyId, reason: "står i exclude.txt" });
      continue;
    }
    const createdAt = gmt(row.post_date_gmt);
    if (!createdAt || createdAt < CUTOFF) {
      skipped.push({ file, legacyId, reason: `ældre end ${MONTHS_BACK} måneder` });
      continue;
    }
    if (source === "user" && excluded.ids.has(String(row.post_author))) {
      skipped.push({ file, legacyId, reason: "oprettet af intern konto eller testkonto" });
      continue;
    }
    if (row.post_status !== "publish" || meta(row, "_hittegods_status") === "deleted") {
      skipped.push({ file, legacyId, reason: `slettet i det gamle system (${String(row.post_status)})` });
      continue;
    }

    const type = meta(row, "_hittegods_type");
    if (type !== "lost" && type !== "found") {
      skipped.push({ file, legacyId, reason: `ukendt type "${type}"` });
      continue;
    }

    const title = decodeEntities(str(row.post_title)).slice(0, 100);
    if (!title) {
      skipped.push({ file, legacyId, reason: "mangler titel" });
      continue;
    }

    // Owner: the author's account if they're imported; otherwise the contact e-mail. A guest
    // whose e-mail belongs to an imported user is linked to that account, so they can manage it.
    const author = source === "user" ? usersById.get(String(row.post_author)) : undefined;
    const contact = email(
      firstOf(
        meta(row, "_hg_real_contact_email"),
        meta(row, "_hittegods_kontakt_email"),
        meta(row, "_lf_contact_email"),
        str(row.email_samlet),
        str(row.forfatter_email),
      ),
    );
    if (contact && (excluded.emails.has(contact) || isInternalEmail(contact))) {
      skipped.push({ file, legacyId, reason: "kontakt-e-mail fra intern konto eller testkonto" });
      continue;
    }
    const ownerEmail = author?.email ?? (contact && userEmails.has(contact) ? contact : null);
    if (!ownerEmail && !contact) {
      skipped.push({ file, legacyId, reason: "hverken bruger eller kontakt-e-mail" });
      continue;
    }

    const description = decodeEntities(str(row.post_content)).slice(0, 2000) || null;
    const { category, how } = categoryFor(row, title, description ?? "");

    const date = firstOf(meta(row, "_hittegods_date"), meta(row, "_lf_date"));
    const town = firstOf(meta(row, "_hittegods_by"), meta(row, "_lf_by"), meta(row, "_lf_by_omraade"));
    const where = firstOf(
      meta(row, "_hittegods_specific_location"),
      meta(row, "_lf_specific_location"),
      meta(row, "_hittegods_location"),
      meta(row, "_lf_location"),
    );

    let found: Place | null = null;
    let matchedOn: string | null = null;
    for (const q of placeQueries(town)) {
      found = await geocode(q, cache);
      if (found) {
        matchedOn = q;
        break;
      }
    }

    // A postal code lookup gives no town name: take it from the text after the code
    // ("8320 Mårslet" → "Mårslet"), else the municipality.
    // Not found: no town, the text is kept as "sted" instead ("I bus 5C" is no town).
    const afterPostal = town.match(/\b\d{4}\s+([\p{L}][\p{L} .-]*)/u)?.[1];
    const city = found ? (found.city ?? (afterPostal ? tidyTown(afterPostal) : found.municipality)) : null;

    const closed = meta(row, "_lost_found_status") === "lukket" || Boolean(meta(row, "_lf_closed_at"));
    items.push({
      legacyId,
      source,
      ownerEmail,
      contactEmail: ownerEmail ? null : contact,
      type,
      status: closed ? "resolved" : "active",
      title,
      description,
      category,
      categoryHow: how,
      occurredAt: /^\d{4}-\d\d-\d\d$/.test(date) ? `${date}T12:00:00Z` : (gmt(row.post_date_gmt) ?? new Date().toISOString()),
      createdAt,
      place: {
        raw: town,
        matchedOn,
        address: placeAddress(town, where, city),
        city,
        postalCode: found?.postalCode ?? null,
        municipality: found?.municipality ?? null,
        region: found?.region ?? null,
        latitude: found?.latitude ?? null,
        longitude: found?.longitude ?? null,
      },
      images: Array.isArray(row.billeder_alle) ? row.billeder_alle.map(String) : [],
    });
  }
  return items;
}

// Town typed by hand after a postal code: "kbh k" → "København K", "tranbjerg." → "Tranbjerg",
// "Hillerød kl 9" → "Hillerød".
function tidyTown(text: string) {
  const town = text
    .replace(/\s+kl\b.*$/i, "")
    .replace(/[.,;:]+$/, "")
    .replace(/\bkbh\b/i, "København")
    .trim();
  return town
    .split(" ")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

// "Præcis adresse / sted": the specific place if given, else the free-text town field when it
// says more than the town (a street, a station, "bus 6A mod Nørreport").
function placeAddress(town: string, where: string, city: string | null) {
  const text = where && where.toLowerCase() !== town.toLowerCase() ? where : town;
  if (!text || (city && text.toLowerCase() === city.toLowerCase())) return null;
  return text.slice(0, 200);
}

// --- Report ----------------------------------------------------------------------------------

function count<T>(values: T[]) {
  const map = new Map<T, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function report(users: OutUser[], items: OutItem[], skipped: Skip[]) {
  const table = (rows: [unknown, number][]) =>
    ["| Værdi | Antal |", "| --- | --- |", ...rows.map(([v, n]) => `| ${String(v)} | ${n} |`)].join("\n");
  const unmatched = count(items.filter((i) => !i.place.region).map((i) => i.place.raw || "(tom)"));
  return `# Rapport over omformning

Lavet ${new Date().toISOString()}. Filen indeholder ikke e-mails eller navne, men steder og ids fra det gamle system.

## Resultat

- Brugere: ${users.length} (${users.filter((u) => u.postCount > 0).length} med opslag)
- Opslag: ${items.length} (${items.filter((i) => i.ownerEmail).length} på en konto, ${items.filter((i) => !i.ownerEmail).length} uden konto)
- Billeder: ${items.reduce((n, i) => n + i.images.length, 0)} på ${items.filter((i) => i.images.length).length} opslag
- Sprunget over: ${skipped.length}
- Periode: opslag oprettet fra ${CUTOFF.slice(0, 10)}

### Sprunget over, fordelt på grund

${table(count(skipped.map((s) => s.reason)))}

## Brugere

${table(count(users.map((u) => `${u.role}${u.accountType ? ` / ${u.accountType}` : ""}`)))}

### Brugere at kigge på

E-mails, der ligner tests eller stavefejl. De er taget med; flyt dem til \`EXCLUDED_LOGINS\` i transform.ts, hvis de ikke skal.

${users
  .filter((u) => /@(hej|test|example)\.|\.(vom|con|cm|dkk)$|@gmail\.dk$/.test(u.email))
  .map((u) => `- id ${u.legacyId}: domænet ${u.email.split("@")[1]}`)
  .join("\n") || "Ingen."}

## Kategorier

${table(count(items.map((i) => i.category)))}

### Hvordan kategorien blev fundet

${table(count(items.map((i) => i.categoryHow)))}

## Steder

- Fundet med postnummer, kommune og region: ${items.filter((i) => i.place.region).length} af ${items.length}
- Ikke fundet: ${items.filter((i) => !i.place.region).length}. Teksten gemmes som by, men opslaget kommer ikke med i filtrene for region og kommune.

### Steder, der ikke blev fundet

${table(unmatched)}

## Mulige tests eller spam

Ikke sprunget over. Tilføj ids til \`data/exclude.txt\` (ét pr. linje), hvis de ikke skal med, og kør igen.

| Gammelt id | Titel |
| --- | --- |
${items.filter((i) => looksSuspicious(i.title)).map((i) => `| ${i.legacyId} | ${i.title.replace(/\|/g, "/")} |`).join("\n")}

## Sprunget over

| Fil | Gammelt id | Grund |
| --- | --- | --- |
${skipped.map((s) => `| ${s.file} | ${s.legacyId} | ${s.reason} |`).join("\n")}
`;
}

// --- Main ------------------------------------------------------------------------------------

async function main() {
  const cache: GeocodeCache = existsSync(GEOCODE_CACHE) ? JSON.parse(readFileSync(GEOCODE_CACHE, "utf8")) : {};
  const skipped: Skip[] = [];
  for (const [query, place] of Object.entries(cache)) {
    if (!place || query.startsWith("postnummer:")) continue;
    if (place.city) knownTowns.add(place.city);
    if (!/[\s,]/.test(query)) knownTowns.add(query);
  }
  const exclude = readExcludeList();

  const { users: candidates, excludedIds, excludedEmails } = transformUsers(readJsonLines(FILES.users), skipped);
  const usersById = new Map(candidates.map((u) => [u.legacyId, u]));
  const userEmails = new Set(candidates.map((u) => u.email));
  const excluded = { ids: excludedIds, emails: excludedEmails };
  console.log(`Kun opslag fra ${CUTOFF.slice(0, 10)} og frem.`);

  console.log("Slår steder op (højst 1 i sekundet, gemte svar genbruges)...");
  const items = [
    ...(await transformItems(readJsonLines(FILES.userPosts), "user", exclude, usersById, userEmails, excluded, cache, skipped)),
    ...(await transformItems(readJsonLines(FILES.guestPosts), "guest", exclude, usersById, userEmails, excluded, cache, skipped)),
  ];
  writeFileSync(GEOCODE_CACHE, JSON.stringify(cache, null, 1));

  // Users active in the period, or owning an imported item.
  const owners = new Set(items.map((i) => i.ownerEmail).filter(Boolean));
  const users = candidates.filter((u) => {
    const active = [u.registeredAt, u.lastLoginAt].some((d) => d && d >= CUTOFF) || owners.has(u.email);
    if (!active) skipped.push({ file: "users", legacyId: u.legacyId, reason: `ikke aktiv de sidste ${MONTHS_BACK} måneder` });
    return active;
  });
  console.log(`Brugere: ${users.length}`);
  console.log(`Opslag: ${items.length}. Sprunget over: ${skipped.length}.`);

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "users.json"), JSON.stringify(users, null, 2));
  writeFileSync(join(OUT, "items.json"), JSON.stringify(items, null, 2));
  writeFileSync(join(OUT, "report.md"), report(users, items, skipped));
  console.log(`Skrevet til ${OUT}: users.json, items.json, report.md`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
