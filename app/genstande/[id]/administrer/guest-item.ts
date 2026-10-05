import "server-only";
import { validManageToken } from "../../../../lib/item-expiry";
import type { ItemResolution, ItemStatus, ItemType } from "../../../../lib/item-card";
import { createAdminClient } from "../../../../lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GuestItem = {
  id: string;
  title: string;
  type: ItemType;
  status: ItemStatus;
  resolution: ItemResolution | null;
  expires_at: string;
  contact_email: string;
};

// An item posted without an account, if the token is the one from its mails. Read with the
// secret key, since contact_email can't be read through the API and RLS hides archived items.
export async function guestItem(itemId: string, token: string): Promise<GuestItem | null> {
  if (!UUID_RE.test(itemId) || !validManageToken(itemId, token)) return null;
  const { data } = await createAdminClient()
    .from("items")
    .select("id, title, type, status, resolution, expires_at, contact_email, user_id")
    .eq("id", itemId)
    .maybeSingle<GuestItem & { user_id: string | null }>();
  if (!data || data.user_id || !data.contact_email) return null;
  return data;
}
