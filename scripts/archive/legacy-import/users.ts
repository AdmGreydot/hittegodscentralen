// Moves the old Hittegodscentralen users into Supabase Auth. Users are created without a
// password: the only way in is "Glemt adgangskode". Old passwords can't be moved. The mail telling
// them so is sent by scripts/send-legacy-mails.ts.
//
//   npm run import:users                         dry run: shows what would happen, writes nothing
//   npm run import:users -- --commit             creates the users
//
// Safe to run again: existing e-mails are skipped.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_RE } from "../../../app/auth/validation";
import { createAdminClient } from "../../../lib/supabase/admin";
import type { OutUser } from "./transform";

// Written by transform.ts (npm run import:transform).
const DATA_FILE = join(process.cwd(), "scripts/archive/legacy-import/data/out/users.json");

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");

type LegacyUser = OutUser;

// transform.ts has already cleaned and de-duplicated the users; this only guards against a
// hand-edited file.
function readLegacyUsers() {
  const rows = JSON.parse(readFileSync(DATA_FILE, "utf8")) as LegacyUser[];
  const users: LegacyUser[] = [];
  const skipped: LegacyUser[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!EMAIL_RE.test(row.email) || seen.has(row.email)) skipped.push(row);
    else {
      seen.add(row.email);
      users.push(row);
    }
  }
  return { users, skipped };
}

type Admin = ReturnType<typeof createAdminClient>;

// Every user already in Supabase, by e-mail.
async function existingUsers(supabase: Admin) {
  const byEmail = new Map<string, { id: string; appMetadata: Record<string, unknown> }>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), { id: u.id, appMetadata: u.app_metadata ?? {} });
    }
    if (data.users.length < 1000) return byEmail;
  }
}

async function createUsers(supabase: Admin, users: LegacyUser[], existing: Awaited<ReturnType<typeof existingUsers>>) {
  const toCreate = users.filter((u) => !existing.has(u.email));
  console.log(`Brugere i eksporten: ${users.length}. Findes allerede: ${users.length - toCreate.length}. Nye: ${toCreate.length}.`);
  if (!COMMIT) return;

  let created = 0;
  for (const u of toCreate) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      email_confirm: true, // they had an account before; no new confirmation mail
      user_metadata: { full_name: u.fullName }, // copied to public.users by the handle_new_user trigger
      // app_metadata can't be changed by the user.
      app_metadata: { legacy_id: u.legacyId, legacy_role: u.role, legacy_account_type: u.accountType },
    });
    if (error) {
      console.error(`  ✗ ${u.email}: ${error.message}`);
      continue;
    }
    existing.set(u.email, { id: data.user.id, appMetadata: data.user.app_metadata ?? {} });
    // The profile row is made by a trigger; the phone number isn't part of that.
    if (u.phone) await supabase.from("users").update({ phone: u.phone }).eq("id", data.user.id);
    created++;
  }
  console.log(`Oprettet: ${created}.`);
}

async function main() {
  console.log(COMMIT ? "Kører med --commit: skriver til databasen." : "Prøvekørsel: skriver intet. Tilføj --commit for at køre.");
  console.log(`Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  const { users, skipped } = readLegacyUsers();
  if (skipped.length) console.log(`Springer ${skipped.length} rækker over (ugyldig e-mail eller dublet).`);

  const supabase = createAdminClient();
  const existing = await existingUsers(supabase);
  await createUsers(supabase, users, existing);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
