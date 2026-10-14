// Sends the "ny hjemmeside: vælg en ny adgangskode" mail to the users moved over from the old
// Hittegodscentralen. Finds them in Supabase Auth: users with app_metadata.legacy_id that haven't
// been mailed yet (app_metadata.legacy_invited_at). Safe to run again: nobody is mailed twice.
//
// Run against production with its env file:
//
//   npx tsx --conditions=react-server --env-file=.env.production scripts/send-legacy-mails.ts
//                                    dry run: shows how many, sends nothing
//   ... scripts/send-legacy-mails.ts --commit --limit 10
//                                    sends to up to 10 users
import { legacyAccountMail } from "../lib/emails";
import { sendMail } from "../lib/mail";
import { createAdminClient } from "../lib/supabase/admin";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;

async function main() {
  console.log(COMMIT ? "Kører med --commit: sender mails." : "Prøvekørsel: sender intet. Tilføj --commit for at sende.");
  console.log(`Database: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`);

  const supabase = createAdminClient();
  const legacy = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    legacy.push(...data.users.filter((u) => u.email && u.app_metadata?.legacy_id !== undefined));
    if (data.users.length < 1000) break;
  }

  const pending = legacy.filter((u) => !u.app_metadata.legacy_invited_at).slice(0, LIMIT);
  console.log(`Gamle brugere: ${legacy.length}. Mangler mail: ${legacy.filter((u) => !u.app_metadata.legacy_invited_at).length}.`);
  console.log(`Sender til: ${pending.length}${Number.isFinite(LIMIT) ? ` (højst ${LIMIT} denne gang)` : ""}.`);
  if (!COMMIT) return;

  let sent = 0;
  for (const u of pending) {
    const fullName = u.user_metadata?.full_name;
    const ok = await sendMail({ to: u.email!, ...legacyAccountMail(typeof fullName === "string" ? fullName : "") });
    if (!ok) {
      console.error(`  ✗ ${u.email}: mailen kunne ikke sendes`);
      continue;
    }
    const { error } = await supabase.auth.admin.updateUserById(u.id, {
      app_metadata: { ...u.app_metadata, legacy_invited_at: new Date().toISOString() },
    });
    // Stop rather than risk mailing the same user again on the next run.
    if (error) throw new Error(`${u.email} fik mailen, men kunne ikke markeres som mailet: ${error.message}`);
    sent++;
    // Resend allows a few requests per second.
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log(`Sendt: ${sent}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
