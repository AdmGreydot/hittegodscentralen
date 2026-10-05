import "server-only";
import { createAdminClient } from "../../../../lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ExtendableItem = { id: string; title: string; expires_at: string };

// The item if it can be extended: still up, or archived because it expired (no resolution).
// Items the poster marked as done can't be brought back this way. Read with the secret key,
// since RLS hides archived items from everyone but a logged-in owner.
export async function extendableItem(itemId: string): Promise<ExtendableItem | null> {
  if (!UUID_RE.test(itemId)) return null;
  const { data } = await createAdminClient()
    .from("items")
    .select("id, title, expires_at, status, resolution")
    .eq("id", itemId)
    .maybeSingle<ExtendableItem & { status: string; resolution: string | null }>();
  if (!data) return null;
  const extendable = data.status === "active" || (data.status === "archived" && !data.resolution);
  return extendable ? data : null;
}
