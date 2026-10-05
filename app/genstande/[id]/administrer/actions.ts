"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { itemDeletedMail } from "../../../../lib/emails";
import { isResolutionFor, type ItemResolution } from "../../../../lib/item-card";
import { newExpiryDate } from "../../../../lib/item-expiry";
import { removeItemImageFiles } from "../../../../lib/item-images";
import { sendMail } from "../../../../lib/mail";
import { createAdminClient } from "../../../../lib/supabase/admin";
import { guestItem } from "./guest-item";

// What a poster without an account can do from the link in their mails. Every action checks
// the signed token again, since server actions can be called directly.

type Result = { error?: string };
const NOT_FOUND = "Linket virker ikke længere. Opslaget er måske slettet.";
const FAILED = "Opslaget kunne ikke opdateres. Prøv igen om lidt.";

async function update(itemId: string, token: string, fields: Record<string, unknown>): Promise<Result> {
  const item = await guestItem(itemId, token);
  if (!item) return { error: NOT_FOUND };
  const { error } = await createAdminClient().from("items").update(fields).eq("id", item.id);
  if (error) {
    console.error("guest item update failed", error);
    return { error: FAILED };
  }
  refresh();
  return {};
}

export async function resolveGuestItem(itemId: string, token: string, resolution: ItemResolution) {
  const item = await guestItem(itemId, token);
  if (!item) return { error: NOT_FOUND };
  if (!isResolutionFor(item.type, resolution)) return { error: "Vælg hvordan det endte." };
  return update(itemId, token, {
    status: resolution === "gave_up" ? "archived" : "resolved",
    resolution,
  });
}

export async function extendGuestItem(itemId: string, token: string) {
  return update(itemId, token, { expires_at: newExpiryDate(), expiry_warned_at: null });
}

export async function reopenGuestItem(itemId: string, token: string) {
  return update(itemId, token, {
    status: "active",
    resolution: null,
    status_note: null,
    expires_at: newExpiryDate(),
    expiry_warned_at: null,
  });
}

export async function deleteGuestItem(itemId: string, token: string): Promise<Result> {
  const item = await guestItem(itemId, token);
  if (!item) return { error: NOT_FOUND };
  const supabase = createAdminClient();
  await removeItemImageFiles(supabase, [item.id]);
  const { error } = await supabase.from("items").delete().eq("id", item.id);
  if (error) {
    console.error("deleteGuestItem failed", error);
    return { error: "Opslaget kunne ikke slettes. Prøv igen om lidt." };
  }
  const mail = itemDeletedMail({ fullName: "", itemTitle: item.title, hasAccount: false });
  after(() => sendMail({ to: item.contact_email, ...mail }));
  redirect(`/genstande/${itemId}/administrer?slettet=1`);
}
