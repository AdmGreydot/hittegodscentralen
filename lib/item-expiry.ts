import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "./mail";

// How long an item stays up before it expires, and how early the poster is warned.
export const ITEM_LIFETIME_MONTHS = 6;
export const EXPIRY_WARNING_DAYS = 14;

export function newExpiryDate(from = new Date()) {
  const date = new Date(from);
  date.setMonth(date.getMonth() + ITEM_LIFETIME_MONTHS);
  return date.toISOString();
}

// Links in mails that work without logging in (posters without an account have nothing to log
// in with), so they're signed instead. `purpose` keeps one kind of link from working as another.
function sign(purpose: string, data: string) {
  return createHmac("sha256", `${purpose}:${process.env.SUPABASE_SECRET_KEY}`)
    .update(data)
    .digest("base64url");
}

function matches(expected: string, given: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

// "Forlæng" in the expiry mails. Covers the current expiry date, so the link stops working once
// the item has been extended.
const extendData = (itemId: string, expiresAt: string) => `${itemId}:${new Date(expiresAt).toISOString()}`;

export function extendUrl(itemId: string, expiresAt: string) {
  return `${SITE_URL}/genstande/${itemId}/forlaeng?token=${sign("item-extend", extendData(itemId, expiresAt))}`;
}

export function validExtendToken(itemId: string, expiresAt: string, token: string) {
  return matches(sign("item-extend", extendData(itemId, expiresAt)), token);
}

// "Administrer dit opslag" for items posted without an account: mark as resolved, extend,
// reopen or delete. Lasts as long as the item, like the poster's own key to it.
export function manageUrl(itemId: string) {
  return `${SITE_URL}/genstande/${itemId}/administrer?token=${sign("item-manage", itemId)}`;
}

export function validManageToken(itemId: string, token: string) {
  return matches(sign("item-manage", itemId), token);
}
