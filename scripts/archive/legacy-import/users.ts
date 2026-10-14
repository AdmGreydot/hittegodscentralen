// Moves the old Hittegodscentralen users into Supabase Auth and sends them a "vælg ny
// adgangskode" mail. Users are created without a password: the only way in is the link in the
// mail (or "Glemt adgangskode"). Old passwords can't be moved.
//
//   npm run import:users                         dry run: shows what would happen, writes nothing
//   npm run import:users -- --commit             creates the users
//   npm run import:users -- --commit --send-mails --limit 100
//                                                also mails up to 100 imported users not mailed yet
//
// Safe to run again: existing e-mails are skipped, and a user is only mailed once (tracked in
// app_metadata.legacy_invited_at).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EMAIL_RE } from "../../../app/auth/validation";
import { legacyAccountMail } from "../../../lib/emails";
import { SITE_URL, sendMail } from "../../../lib/mail";
import { createAdminClient } from "../../../lib/supabase/admin";
import type { OutUser } from "./transform";

// Written by transform.ts (npm run import:transform).
const DATA_FILE = join(process.cwd(), "scripts/archive/legacy-import/data/out/users.json");

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const SEND_MAILS = args.includes("--send-mails");
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

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

// "Vælg ny adgangskode" to imported users who haven't had it yet.
async function sendInvites(supabase: Admin, users: LegacyUser[], existing: Awaited<ReturnType<typeof existingUsers>>) {
  const pending = users
    .map((u) => ({ ...u, account: existing.get(u.email) }))
    // In a dry run the new users aren't created, so count them as pending too.
    .filter((u) =>
      u.account
        ? u.account.appMetadata.legacy_id !== undefined && !u.account.appMetadata.legacy_invited_at
        : !COMMIT,
    )
    .slice(0, LIMIT);
  console.log(`Mangler mail: ${pending.length}${Number.isFinite(LIMIT) ? ` (højst ${LIMIT} denne gang)` : ""}.`);
  if (!COMMIT) return;

  let sent = 0;
  for (const u of pending) {
    const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email: u.email });
    if (error) {
      console.error(`  ✗ ${u.email}: ${error.message}`);
      continue;
    }
    const params = new URLSearchParams({
      token_hash: data.properties.hashed_token,
      type: "recovery",
      next: "/nulstil-adgangskode",
    });
    const ok = await sendMail({ to: u.email, ...legacyAccountMail(u.fullName, `${SITE_URL}/auth/confirm?${params}`) });
    if (!ok) {
      console.error(`  ✗ ${u.email}: mailen kunne ikke sendes`);
      continue;
    }
    await supabase.auth.admin.updateUserById(u.account!.id, {
      app_metadata: { ...u.account!.appMetadata, legacy_invited_at: new Date().toISOString() },
    });
    sent++;
    // Resend allows a few requests per second.
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log(`Sendt: ${sent}.`);
}

async function main() {
  console.log(COMMIT ? "Kører med --commit: skriver til databasen." : "Prøvekørsel: skriver intet. Tilføj --commit for at køre.");
  console.log(`Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}. Links i mails: ${SITE_URL}\n`);

  const { users, skipped } = readLegacyUsers();
  if (skipped.length) console.log(`Springer ${skipped.length} rækker over (ugyldig e-mail eller dublet).`);

  const supabase = createAdminClient();
  const existing = await existingUsers(supabase);
  await createUsers(supabase, users, existing);
  if (SEND_MAILS) await sendInvites(supabase, users, existing);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
