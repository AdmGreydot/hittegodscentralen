"use server";

import type { ItemStatus, ItemType } from "../../lib/item-card";
import { contactFormMail, itemRelayMail, senderReceiptMail } from "../../lib/emails";
import { manageUrl } from "../../lib/item-expiry";
import { CONTACT_INBOX, sendMail, withinRateLimit } from "../../lib/mail";
import { createAdminClient } from "../../lib/supabase/admin";

// Same name as the honeypot fields in the forms. Sounds like a real field so bots fill it in.
const HONEYPOT_FIELD = "website";

const MAX_MESSAGE_LENGTH = 2000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "name" | "email" | "phone" | "message";
export type MailResult = { errors?: Partial<Record<Field, string>>; message?: string; sent?: boolean };

const SEND_FAILED = "Beskeden kunne ikke sendes. Prøv igen om lidt.";
const RATE_LIMITED = "Du har sendt mange beskeder på kort tid. Prøv igen senere.";

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// The sender's details, checked the same way for both forms.
function readSender(form: FormData) {
  const sender = {
    name: text(form, "name").replace(/\s+/g, " "),
    email: text(form, "email"),
    phone: text(form, "phone"),
    message: text(form, "message"),
  };
  const errors: MailResult["errors"] = {};
  if (!sender.name) errors.name = "Skriv dit navn.";
  else if (sender.name.length > 100) errors.name = "Navnet er for langt.";
  if (!EMAIL_RE.test(sender.email) || sender.email.length > 254) {
    errors.email = "Skriv en gyldig e-mail.";
  }
  if (sender.phone.length > 30) errors.phone = "Telefonnummeret er for langt.";
  if (!sender.message) errors.message = "Skriv en besked først.";
  else if (sender.message.length > MAX_MESSAGE_LENGTH) {
    errors.message = `Beskeden må højst være ${MAX_MESSAGE_LENGTH} tegn.`;
  }
  return { sender, errors };
}

// The contact form on /kontakt. Delivered to our own inbox; replying goes straight to the sender.
export async function sendContactMail(form: FormData): Promise<MailResult> {
  // Honeypot filled in: a bot. Pretend it worked so it doesn't retry.
  if (text(form, HONEYPOT_FIELD)) return { sent: true };

  const { sender, errors } = readSender(form);
  if (Object.keys(errors).length) return { errors };
  if (!(await withinRateLimit("contact"))) return { message: RATE_LIMITED };

  const sent = await sendMail({
    to: CONTACT_INBOX,
    replyTo: sender.email,
    ...contactFormMail(sender),
  });
  if (!sent) return { message: SEND_FAILED };
  await sendMail({ to: sender.email, ...senderReceiptMail({ name: sender.name, message: sender.message }) });
  return { sent: true };
}

// A message to someone who posted an item without an account. Their e-mail never leaves the
// server: the mail is sent from info@ with Reply-To set to the sender, so the poster decides
// for themselves whether to answer (and thereby share their address).
export async function sendItemMail(itemId: string, form: FormData): Promise<MailResult> {
  if (text(form, HONEYPOT_FIELD)) return { sent: true };
  if (!UUID_RE.test(itemId)) return { message: "Genstanden findes ikke." };

  const { sender, errors } = readSender(form);
  if (Object.keys(errors).length) return { errors };

  // contact_email can't be read through the API, so look it up with the secret key.
  const supabase = createAdminClient();
  const { data: item } = await supabase
    .from("items")
    .select("title, type, status, user_id, contact_email")
    .eq("id", itemId)
    .maybeSingle<{
      title: string;
      type: ItemType;
      status: ItemStatus;
      user_id: string | null;
      contact_email: string | null;
    }>();
  if (!item || item.user_id || !item.contact_email) return { message: "Genstanden findes ikke." };
  if (item.status !== "active") return { message: "Opslaget er ikke længere aktivt." };

  if (!(await withinRateLimit("item"))) return { message: RATE_LIMITED };

  const sent = await sendMail({
    to: item.contact_email,
    replyTo: sender.email,
    ...itemRelayMail({
      sender,
      itemId,
      itemTitle: item.title,
      itemType: item.type,
      manageUrl: manageUrl(itemId),
    }),
  });
  if (sent) {
    await sendMail({
      to: sender.email,
      ...senderReceiptMail({
        name: sender.name,
        message: sender.message,
        item: { title: item.title, type: item.type },
      }),
    });
  }
  return sent ? { sent: true } : { message: SEND_FAILED };
}
