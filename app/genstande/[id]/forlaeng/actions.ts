"use server";

import { redirect } from "next/navigation";
import { newExpiryDate, validExtendToken } from "../../../../lib/item-expiry";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { extendableItem } from "./item";

// Extends an item from the link in the "udløber snart" mail. No login needed: the signed token
// is the proof. An item that already expired comes back up.
export async function extendItem(itemId: string, token: string) {
  const item = await extendableItem(itemId);
  if (!item || !validExtendToken(item.id, item.expires_at, token)) {
    redirect(`/genstande/${itemId}/forlaeng?token=${encodeURIComponent(token)}`);
  }

  const { error } = await createAdminClient()
    .from("items")
    .update({ status: "active", expires_at: newExpiryDate(), expiry_warned_at: null })
    .eq("id", item.id)
    .eq("expires_at", item.expires_at);
  if (error) {
    console.error("extendItem failed", error);
    redirect(`/genstande/${itemId}/forlaeng?token=${encodeURIComponent(token)}&fejl=1`);
  }
  redirect(`/genstande/${itemId}?forlaenget=1`);
}
