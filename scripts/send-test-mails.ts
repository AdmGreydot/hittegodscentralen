// Sends one of every e-mail the site sends, with sample data, so they can be checked in a real
// inbox. Run: npm run mail:test -- you@example.com
import {
  confirmEmailMail,
  contactFormMail,
  itemCreatedMail,
  itemExpiringMail,
  itemRelayMail,
  newMessageMail,
  resetPasswordMail,
  unreadReminderMail,
  welcomeMail,
} from "../lib/emails";
import { SITE_URL, sendMail, type Mail } from "../lib/mail";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Brug: npm run mail:test -- din@mail.dk");
  process.exit(1);
}

const NAME = "Morten Kirch Pedersen";
const ITEM_ID = "00000000-0000-0000-0000-000000000000";
const CONVERSATION_ID = "00000000-0000-0000-0000-000000000001";
const sender = {
  name: "Ilona Taran",
  email: "ilona@example.com",
  phone: "12 34 56 78",
  message: "Hej! Jeg tror, jeg har fundet din højtaler ved Christianslund.\nDen er hvid og ligger i en sort taske.",
};

const mails: [string, Mail][] = [
  ["Bekræft e-mail", confirmEmailMail(NAME, `${SITE_URL}/auth/confirm?token_hash=test&type=signup&next=/profil`)],
  ["Velkomst", welcomeMail(NAME)],
  ["Nulstil adgangskode", resetPasswordMail(NAME, `${SITE_URL}/auth/confirm?token_hash=test&type=recovery&next=/nulstil-adgangskode`)],
  ["Ny besked", newMessageMail({ recipientName: NAME, senderName: sender.name, itemTitle: "JBL højtaler", body: sender.message, conversationId: CONVERSATION_ID })],
  ["Opslag oprettet (med profil)", itemCreatedMail({ fullName: NAME, itemId: ITEM_ID, itemTitle: "JBL højtaler", itemType: "lost", hasAccount: true })],
  ["Opslag oprettet (uden profil)", itemCreatedMail({ fullName: "", itemId: ITEM_ID, itemTitle: "Sort iPhone 14 Pro", itemType: "found", hasAccount: false })],
  ["Ulæst påmindelse", unreadReminderMail(NAME, [
    { conversationId: CONVERSATION_ID, senderName: sender.name, itemTitle: "JBL højtaler", messages: ["Hej, er den stadig væk?", "Jeg kan aflevere den i morgen.", "Skriv gerne, hvornår det passer dig.", sender.message] },
    { conversationId: CONVERSATION_ID, senderName: "Jens Hansen", itemTitle: "Blå rygsæk", messages: ["Er det din rygsæk med klistermærker på?"] },
  ])],
  ["Opslag udløber snart", itemExpiringMail({ fullName: NAME, itemId: ITEM_ID, itemTitle: "JBL højtaler", expiresAt: new Date(Date.now() + 14 * 864e5).toISOString(), extendUrl: `${SITE_URL}/genstande/${ITEM_ID}/forlaeng?token=test`, hasAccount: true })],
  ["Kontaktformular", contactFormMail(sender)],
  ["Besked til bruger uden profil", itemRelayMail({ sender, itemId: ITEM_ID, itemTitle: "Sort iPhone 14 Pro", itemType: "found" })],
];

async function main() {
  for (const [label, mail] of mails) {
    const ok = await sendMail({ to, ...mail, subject: `[TEST] ${mail.subject}` });
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    // Resend allows a few requests per second.
    await new Promise((r) => setTimeout(r, 600));
  }
}

main();
