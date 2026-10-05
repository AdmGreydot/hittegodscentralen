import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { headers } from "next/headers";
import { Resend } from "resend";
import { createAdminClient } from "./supabase/admin";

// All mail goes out from info@. hittegodscentralen.dk must be verified as a domain in Resend.
export const MAIL_FROM = "Hittegodscentralen <info@hittegodscentralen.dk>";
// Where the contact form on /kontakt is delivered.
export const CONTACT_INBOX = "kontakt@hittegodscentralen.dk";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hittegodscentralen.dk";

const resend = new Resend(process.env.RESEND_API_KEY);

export type Mail = { subject: string; text: string; html: string };

// The logo travels inside each mail (shown via cid:logo), so it works before the site is live
// on hittegodscentralen.dk and without the reader loading remote images. next.config.ts makes
// sure the file is deployed with the server code.
const LOGO_CID = "logo";
let logo: Buffer | undefined;
function logoAttachment() {
  logo ??= readFileSync(join(process.cwd(), "lib/assets/email-logo.png"));
  return { filename: "hittegodscentralen.png", content: logo, contentId: LOGO_CID };
}

// Without replyTo, replies go to info@.
export async function sendMail(mail: Mail & { to: string; replyTo?: string }) {
  const { error } = await resend.emails.send({
    from: MAIL_FROM,
    ...mail,
    attachments: [logoAttachment()],
  });
  if (error) {
    console.error("sendMail failed", error);
    return false;
  }
  return true;
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Brand colours from globals.css.
export const BRAND = { brown: "#493326", rust: "#ba4e2f", gold: "#f2c269" };

// Shared frame so all mails look alike. `body` must already be escaped.
export function mailHtml(body: string) {
  return `<!doctype html>
<html lang="da"><body style="margin:0;background:#f4f4f5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<div style="max-width:560px;margin:0 auto;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.brown};border-radius:12px 12px 0 0;">
<tr><td style="padding:12px 20px;">
<a href="${SITE_URL}" style="text-decoration:none;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;"><img src="cid:${LOGO_CID}" width="76" height="76" alt="Hittegodscentralen" style="display:block;border:0;border-radius:50%;"></td>
<td>
<div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;line-height:1.2;color:#fff;">Hittegodscentralen</div>
<div style="margin-top:3px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${BRAND.gold};">Dækker alt - over alt</div>
</td>
</tr></table>
</a>
</td></tr>
</table>
<div style="background:#fff;border-radius:0 0 12px 12px;padding:28px;line-height:1.55;font-size:15px;">
${body}
</div>
<p style="margin:16px 0 0;font-size:12px;color:#71717a;text-align:center;">
<a href="${SITE_URL}" style="color:#71717a;">Hittegodscentralen</a> · Den hurtigste vej mellem taber og finder
</p>
</div></body></html>`;
}

// Escaped, with line breaks kept.
export function htmlParagraph(text: string) {
  return `<p style="white-space:pre-line;">${escapeHtml(text)}</p>`;
}

export function htmlQuote(text: string) {
  return `<blockquote style="margin:16px 0;border-left:3px solid ${BRAND.gold};padding:4px 16px;white-space:pre-line;color:#3f3f46;">${escapeHtml(text)}</blockquote>`;
}

export function mailButton(href: string, label: string) {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${BRAND.rust};color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;">${escapeHtml(label)}</a></p>`;
}

// Max mails per hour for one visitor (by IP, unless another key is given), per kind.
const RATE_LIMIT = { contact: 5, item: 5, signup: 5, reset: 5, "reset-email": 3 } as const;
export type MailKind = keyof typeof RATE_LIMIT;

// Records the attempt and returns false if the limit is reached. Keys are only stored hashed.
// Fails open: if the log can't be read, the mail is still sent.
export async function withinRateLimit(kind: MailKind, key?: string) {
  if (!key) {
    const forwarded = (await headers()).get("x-forwarded-for");
    key = forwarded?.split(",")[0]?.trim() || "unknown";
  }
  const keyHash = createHash("sha256").update(key).digest("hex");

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("mail_log")
    .select("id", { count: "exact", head: true })
    .eq("kind", kind)
    .eq("key_hash", keyHash)
    .gte("created_at", since);
  if (error) {
    console.error("withinRateLimit: count failed", error);
    return true;
  }
  if ((count ?? 0) >= RATE_LIMIT[kind]) return false;

  await supabase.from("mail_log").insert({ kind, key_hash: keyHash });
  return true;
}

// How long rate-limit entries are kept. The limits only look back an hour; the rest is margin.
const MAIL_LOG_DAYS = 7;

// Deletes old rate-limit entries (privatlivspolitikken promises this). Run daily by the cron route.
export async function pruneMailLog() {
  const before = new Date(Date.now() - MAIL_LOG_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await createAdminClient().from("mail_log").delete().lt("created_at", before);
  if (error) throw error;
}
