import "server-only";
import type { createAdminClient } from "./supabase/admin";

const IMAGE_BUCKET = "item-images";

// Removes the stored image files of the given items. Call before deleting the items; the image
// rows go with them (on delete cascade). Full URLs (test data) aren't in our bucket and are skipped.
export async function removeItemImageFiles(
  supabase: ReturnType<typeof createAdminClient>,
  itemIds: string[],
) {
  if (!itemIds.length) return;
  const { data } = await supabase
    .from("item_images")
    .select("file_path")
    .in("item_id", itemIds)
    .returns<{ file_path: string }[]>();
  const paths = (data ?? []).map((i) => i.file_path).filter((p) => !/^https?:\/\//.test(p));
  if (paths.length) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
}
