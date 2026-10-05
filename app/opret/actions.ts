"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getCurrentUser, getCurrentUserId } from "../../lib/auth";
import { lookupPostalCode } from "../../lib/geo";
import { itemCreatedMail } from "../../lib/emails";
import { newExpiryDate } from "../../lib/item-expiry";
import { sendMail } from "../../lib/mail";
import type { ItemResolution } from "../../lib/item-card";
import { createAdminClient } from "../../lib/supabase/admin";
import {
  EMPTY_DRAFT,
  HONEYPOT_FIELD,
  CONTACT_STEP,
  STEPS,
  validateStep,
  type DraftErrors,
  type ItemDraft,
} from "../components/item-wizard/draft";

// Rough bounding box around Denmark incl. Bornholm. Anything outside is ignored.
function pointInDenmark(form: FormData) {
  const latitude = Number(text(form, "latitude"));
  const longitude = Number(text(form, "longitude"));
  if (!text(form, "latitude") || !text(form, "longitude")) return null;
  if (!(latitude >= 54.5 && latitude <= 57.8 && longitude >= 8 && longitude <= 15.2)) return null;
  return { latitude, longitude };
}

export type CreateItemResult = { errors?: DraftErrors; message?: string };

const IMAGE_BUCKET = "item-images";
// Images are resized in the browser first, so anything near this is suspicious.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// The wizard's fields from the form, checked the same way as in the browser.
// Logged-in users skip the contact step, so their e-mail isn't required.
function readDraft(form: FormData, loggedIn: boolean) {
  const type = text(form, "type");
  const draft: ItemDraft = {
    ...EMPTY_DRAFT,
    type: type === "lost" || type === "found" ? type : null,
    title: text(form, "title"),
    description: text(form, "description"),
    categoryId: text(form, "categoryId"),
    region: text(form, "region"),
    city: text(form, "city"),
    postalCode: text(form, "postalCode"),
    address: text(form, "address"),
    occurredOn: text(form, "occurredOn"),
    email: text(form, "email").toLowerCase(),
  };

  // Same checks as the wizard, all steps except the review.
  const errors: DraftErrors = {};
  for (let step = 0; step < STEPS.length - 1; step++) {
    if (loggedIn && step === CONTACT_STEP) continue;
    Object.assign(errors, validateStep(step, draft));
  }

  const image = form.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  if (file && (!IMAGE_TYPES[file.type] || file.size > MAX_UPLOAD_BYTES)) {
    errors.image = "Billedet kunne ikke bruges. Prøv et andet billede.";
  }
  return { draft, errors, file };
}

// The item columns the wizard controls, incl. municipality and a point for the /genstande filters.
async function itemFields(form: FormData, draft: ItemDraft, categoryId: number) {
  const point = pointInDenmark(form);
  const place = await lookupPostalCode(draft.postalCode);
  return {
    category_id: categoryId,
    type: draft.type!,
    title: draft.title,
    description: draft.description,
    region: draft.region,
    city: draft.city || null,
    postal_code: draft.postalCode || null,
    address: draft.address || null,
    municipality: place?.municipality ?? null,
    // Exact point from "Brug min placering" when given, else the postal code's centre.
    latitude: point?.latitude ?? place?.latitude ?? null,
    longitude: point?.longitude ?? place?.longitude ?? null,
    location_exact: Boolean(point),
    // Noon UTC is the same calendar day in Denmark all year round.
    occurred_at: `${draft.occurredOn}T12:00:00Z`,
  };
}

async function findCategory(supabase: ReturnType<typeof createAdminClient>, categoryId: string) {
  const { data } = await supabase
    .from("categories")
    .select("id")
    .eq("id", Number(categoryId))
    .maybeSingle<{ id: number }>();
  return data;
}

// Uploads the image and links it to the item. Returns the storage path, or null on failure
// (with nothing left behind in storage).
async function saveImage(
  supabase: ReturnType<typeof createAdminClient>,
  file: File,
  itemId: string,
  userId: string | null,
) {
  const path = `${userId ?? "guest"}/${itemId}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error: uploadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type });
  const { error: imageError } = uploadError
    ? { error: uploadError }
    : await supabase.from("item_images").insert({
        item_id: itemId,
        file_path: path,
        file_name: file.name.slice(0, 200),
      });
  if (!imageError) return path;

  console.error("saveImage failed", imageError);
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  return null;
}

// Removes image rows and their files. Full URLs (test data) aren't in our bucket and are skipped.
async function removeImages(
  supabase: ReturnType<typeof createAdminClient>,
  images: { id: string; file_path: string }[],
) {
  if (!images.length) return;
  const paths = images.map((i) => i.file_path).filter((p) => !/^https?:\/\//.test(p));
  if (paths.length) await supabase.storage.from(IMAGE_BUCKET).remove(paths);
  await supabase.from("item_images").delete().in("id", images.map((i) => i.id));
}

// Creates an item from the wizard. Runs with the secret key (bypasses RLS), so everything the
// browser sends is validated here again. Logged in: the item belongs to the user. Not logged in:
// user_id is null and contact goes to the e-mail given.
export async function createItem(form: FormData): Promise<CreateItemResult> {
  // Honeypot filled in: a bot. Act as if it worked, without saving anything.
  if (text(form, HONEYPOT_FIELD)) redirect("/genstande");

  const user = await getCurrentUser();
  const userId = user?.id ?? null;
  const { draft, errors, file } = readDraft(form, Boolean(userId));
  if (Object.keys(errors).length) return { errors };

  const supabase = createAdminClient();
  const category = await findCategory(supabase, draft.categoryId);
  if (!category) return { errors: { categoryId: "Vælg en kategori." } };

  const fields = await itemFields(form, draft, category.id);

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      ...fields,
      user_id: userId,
      // Only stored when there's no user; otherwise contact goes through the account.
      contact_email: userId ? null : draft.email,
      expires_at: newExpiryDate(),
    })
    .select("id")
    .single();
  if (insertError || !item) {
    console.error("createItem: insert failed", insertError);
    return { message: "Opslaget kunne ikke oprettes. Prøv igen om lidt." };
  }

  if (file && !(await saveImage(supabase, file, item.id, userId))) {
    // Don't leave a half-created item behind.
    await supabase.from("items").delete().eq("id", item.id);
    return { message: "Billedet kunne ikke gemmes. Prøv igen, eller opret uden billede." };
  }

  const confirmTo = user?.email || draft.email;
  if (confirmTo && draft.type) {
    const mail = itemCreatedMail({
      fullName: user?.fullName ?? "",
      itemId: item.id,
      itemTitle: draft.title,
      itemType: draft.type,
      hasAccount: Boolean(user),
    });
    after(() => sendMail({ to: confirmTo, ...mail }));
  }

  redirect(`/genstande/${item.id}?oprettet=1`);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The item's id and images, if it exists and belongs to the logged-in user.
async function ownedItem(supabase: ReturnType<typeof createAdminClient>, itemId: string) {
  if (!UUID_RE.test(itemId)) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data } = await supabase
    .from("items")
    .select("id, item_images(id, file_path)")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle<{ id: string; item_images: { id: string; file_path: string }[] }>();
  return data ? { userId, images: data.item_images } : null;
}

// Saves the edit wizard. `keepImage` is set when the existing image wasn't removed; a new file
// replaces the old images.
export async function updateItem(itemId: string, form: FormData): Promise<CreateItemResult> {
  const { draft, errors, file } = readDraft(form, true);
  if (Object.keys(errors).length) return { errors };

  const supabase = createAdminClient();
  const owned = await ownedItem(supabase, itemId);
  if (!owned) return { message: "Du kan kun rette dine egne opslag." };

  const category = await findCategory(supabase, draft.categoryId);
  if (!category) return { errors: { categoryId: "Vælg en kategori." } };

  const { error: updateError } = await supabase
    .from("items")
    .update(await itemFields(form, draft, category.id))
    .eq("id", itemId)
    .eq("user_id", owned.userId);
  if (updateError) {
    console.error("updateItem: update failed", updateError);
    return { message: "Ændringerne kunne ikke gemmes. Prøv igen om lidt." };
  }

  if (file) {
    if (!(await saveImage(supabase, file, itemId, owned.userId))) {
      return { message: "Opslaget er gemt, men billedet kunne ikke gemmes. Prøv igen." };
    }
    await removeImages(supabase, owned.images);
  } else if (!text(form, "keepImage")) {
    await removeImages(supabase, owned.images);
  }

  redirect(`/genstande/${itemId}`);
}

// Deletes one of the user's own items with its images.
export async function deleteItem(itemId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const owned = await ownedItem(supabase, itemId);
  if (!owned) return { error: "Du kan kun slette dine egne opslag." };

  await removeImages(supabase, owned.images);
  const { error } = await supabase.from("items").delete().eq("id", itemId).eq("user_id", owned.userId);
  if (error) {
    console.error("deleteItem failed", error);
    return { error: "Opslaget kunne ikke slettes. Prøv igen om lidt." };
  }

  refresh();
  return {};
}

// Which answers fit which kind of item. gave_up archives the item; the rest mark it resolved.
const RESOLUTIONS: Record<"lost" | "found", ItemResolution[]> = {
  lost: ["returned", "found_self", "gave_up"],
  found: ["returned", "police", "other"],
};

const MAX_NOTE_LENGTH = 500;

// The poster marks their item as done ("afleveret", "fundet", "opgivet"). It then disappears from
// /genstande but stays under "Mine genstande", where it can be reopened.
export async function resolveItem(
  itemId: string,
  input: { resolution: ItemResolution; conversationId: string | null; note: string },
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const owned = await ownedItem(supabase, itemId);
  if (!owned) return { error: "Du kan kun afslutte dine egne opslag." };

  const { data: item } = await supabase
    .from("items")
    .select("type")
    .eq("id", itemId)
    .single<{ type: "lost" | "found" }>();
  if (!item || !RESOLUTIONS[item.type].includes(input.resolution)) {
    return { error: "Vælg hvordan det endte." };
  }

  const note = input.note.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { error: `Noten må højst være ${MAX_NOTE_LENGTH} tegn.` };
  }

  // Only a conversation about this item can be the one it was handed over through.
  let conversationId: string | null = null;
  if (input.resolution === "returned" && input.conversationId) {
    if (!UUID_RE.test(input.conversationId)) return { error: "Samtalen findes ikke." };
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", input.conversationId)
      .eq("item_id", itemId)
      .maybeSingle<{ id: string }>();
    if (!conversation) return { error: "Samtalen findes ikke." };
    conversationId = conversation.id;
  }

  const { error } = await supabase
    .from("items")
    .update({
      status: input.resolution === "gave_up" ? "archived" : "resolved",
      resolution: input.resolution,
      resolved_conversation_id: conversationId,
      status_note: note || null,
    })
    .eq("id", itemId)
    .eq("user_id", owned.userId);
  if (error) {
    console.error("resolveItem failed", error);
    return { error: "Opslaget kunne ikke opdateres. Prøv igen om lidt." };
  }

  refresh();
  return {};
}

// Puts a resolved, archived or expired item back up, e.g. if it was marked by mistake. It gets a
// fresh expiry period.
export async function reopenItem(itemId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const owned = await ownedItem(supabase, itemId);
  if (!owned) return { error: "Du kan kun genåbne dine egne opslag." };

  const { error } = await supabase
    .from("items")
    .update({
      status: "active",
      resolution: null,
      resolved_conversation_id: null,
      status_note: null,
      expires_at: newExpiryDate(),
      expiry_warned_at: null,
    })
    .eq("id", itemId)
    .eq("user_id", owned.userId);
  if (error) {
    console.error("reopenItem failed", error);
    return { error: "Opslaget kunne ikke genåbnes. Prøv igen om lidt." };
  }

  refresh();
  return {};
}
