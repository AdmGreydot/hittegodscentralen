"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "../../lib/auth";
import { createAdminClient } from "../../lib/supabase/admin";
import {
  EMPTY_DRAFT,
  HONEYPOT_FIELD,
  STEPS,
  validateStep,
  type DraftErrors,
  type ItemDraft,
} from "../components/item-wizard/draft";

// Rough bounding box around Denmark incl. Bornholm — anything outside is ignored.
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

// Municipality and an approximate centre point for a Danish postal code, via DAWA.
// Used by the filters on /genstande. Failing to look it up is not fatal.
async function lookupPostalCode(postalCode: string) {
  if (!postalCode) return null;
  try {
    const res = await fetch(`https://api.dataforsyningen.dk/postnumre/${postalCode}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      navn: string;
      kommuner: { navn: string }[];
      visueltcenter: [number, number] | null;
    };
    return {
      city: data.navn,
      municipality: data.kommuner[0]?.navn ?? null,
      longitude: data.visueltcenter?.[0] ?? null,
      latitude: data.visueltcenter?.[1] ?? null,
    };
  } catch {
    return null;
  }
}

// Creates an item from the wizard. Runs with the secret key (bypasses RLS), so everything the
// browser sends is validated here again. Logged in: the item belongs to the user. Not logged in:
// user_id is null and contact goes to the e-mail given.
export async function createItem(form: FormData): Promise<CreateItemResult> {
  // Honeypot filled in: a bot. Act as if it worked, without saving anything.
  if (text(form, HONEYPOT_FIELD)) redirect("/genstande");

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
  for (let step = 0; step < STEPS.length - 1; step++) Object.assign(errors, validateStep(step, draft));

  const image = form.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;
  if (file && (!IMAGE_TYPES[file.type] || file.size > MAX_UPLOAD_BYTES)) {
    errors.image = "Billedet kunne ikke bruges. Prøv et andet billede.";
  }
  if (Object.keys(errors).length) return { errors };

  const supabase = createAdminClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", Number(draft.categoryId))
    .maybeSingle();
  if (!category) return { errors: { categoryId: "Vælg en kategori." } };

  const point = pointInDenmark(form);
  const [userId, place] = await Promise.all([
    getCurrentUserId(),
    lookupPostalCode(draft.postalCode),
  ]);

  const { data: item, error: insertError } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      // Only stored when there's no user; otherwise contact goes through the account.
      contact_email: userId ? null : draft.email,
      category_id: category.id,
      type: draft.type,
      title: draft.title,
      description: draft.description,
      region: draft.region,
      city: draft.city || place?.city || null,
      postal_code: draft.postalCode || null,
      address: draft.address || null,
      municipality: place?.municipality ?? null,
      // Exact point from "Brug min placering" when given, else the postal code's centre.
      latitude: point?.latitude ?? place?.latitude ?? null,
      longitude: point?.longitude ?? place?.longitude ?? null,
      // Noon UTC is the same calendar day in Denmark all year round.
      occurred_at: `${draft.occurredOn}T12:00:00Z`,
    })
    .select("id")
    .single();
  if (insertError || !item) {
    console.error("createItem: insert failed", insertError);
    return { message: "Annoncen kunne ikke oprettes. Prøv igen om lidt." };
  }

  if (file) {
    const path = `${userId ?? "guest"}/${item.id}/${randomUUID()}.${IMAGE_TYPES[file.type]}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type });
    const { error: imageError } = uploadError
      ? { error: uploadError }
      : await supabase.from("item_images").insert({
          item_id: item.id,
          file_path: path,
          file_name: file.name.slice(0, 200),
        });

    if (imageError) {
      // Don't leave a half-created item behind.
      console.error("createItem: image failed", imageError);
      await supabase.storage.from(IMAGE_BUCKET).remove([path]);
      await supabase.from("items").delete().eq("id", item.id);
      return { message: "Billedet kunne ikke gemmes. Prøv igen, eller opret uden billede." };
    }
  }

  redirect(`/genstande/${item.id}?oprettet=1`);
}
