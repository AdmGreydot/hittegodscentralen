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

// The "forlæng" link in the expiry mail works without logging in (posters without an account
// have nothing to log in with), so it's signed instead. The signature covers the current expiry
// date, so a link stops working once the item has been extended.
function sign(itemId: string, expiresAt: string) {
  return createHmac("sha256", `item-extend:${process.env.SUPABASE_SECRET_KEY}`)
    .update(`${itemId}:${new Date(expiresAt).toISOString()}`)
    .digest("base64url");
}

export function extendUrl(itemId: string, expiresAt: string) {
  return `${SITE_URL}/genstande/${itemId}/forlaeng?token=${sign(itemId, expiresAt)}`;
}

export function validExtendToken(itemId: string, expiresAt: string, token: string) {
  const expected = Buffer.from(sign(itemId, expiresAt));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
