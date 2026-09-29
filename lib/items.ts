import { cache } from "react";
import { createClient } from "./supabase/server";
import { PLACEHOLDER_IMAGE, type ItemCard, type ItemType } from "./item-card";
import type { ItemFilters } from "./item-filters";

type ItemRow = {
  id: string;
  type: ItemType;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  occurred_at: string;
  item_images: { file_path: string }[];
};

const IMAGE_BUCKET = "item-images";
const CARD_COLUMNS =
  "id, type, title, description, address, city, occurred_at, item_images(file_path)";

// file_path is a path in the storage bucket; full URLs are passed through (used by test data).
function imageUrl(filePath: string) {
  if (/^https?:\/\//.test(filePath)) return filePath;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${filePath}`;
}

function toCard(row: ItemRow): ItemCard {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    location: row.address ?? row.city,
    occurredAt: row.occurred_at,
    imageUrl: row.item_images[0] ? imageUrl(row.item_images[0].file_path) : PLACEHOLDER_IMAGE,
  };
}

// Midnight in Danish time for a YYYY-MM-DD date, as an ISO timestamp (handles summer/winter time).
function copenhagenMidnight(date: string, addDays = 0) {
  const utc = new Date(`${date}T00:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + addDays);
  const offset = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Copenhagen",
    timeZoneName: "longOffset",
  })
    .formatToParts(utc)
    .find((p) => p.type === "timeZoneName")!
    .value.replace("GMT", "");
  return `${utc.toISOString().slice(0, 10)}T00:00:00${offset || "+00:00"}`;
}

// Quote a value for PostgREST's or() syntax so commas, dots and parentheses in searches are safe.
function orValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Latest active items, newest first, optionally filtered by type.
export async function getLatestItems(limit: number, type?: ItemType) {
  const supabase = await createClient();

  let query = supabase
    .from("items")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "item_images", ascending: true })
    .limit(1, { referencedTable: "item_images" })
    .limit(limit);

  if (type) query = query.eq("type", type);

  const { data, error } = await query.returns<ItemRow[]>();
  if (error) throw error;
  return data.map(toCard);
}

// Filtered, paginated active items for /genstande.
export async function searchItems(filters: ItemFilters) {
  const supabase = await createClient();
  const start = (filters.page - 1) * filters.perPage;

  let query = supabase
    .from("items")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "item_images", ascending: true })
    .limit(1, { referencedTable: "item_images" })
    .range(start, start + filters.perPage - 1);

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.regions.length) query = query.in("region", filters.regions);
  if (filters.municipalities.length) query = query.in("municipality", filters.municipalities);
  if (filters.categories.length) query = query.in("category_id", filters.categories);
  if (filters.from) query = query.gte("occurred_at", copenhagenMidnight(filters.from));
  if (filters.to) query = query.lt("occurred_at", copenhagenMidnight(filters.to, 1));
  if (filters.q) {
    const term = orValue(`%${filters.q}%`);
    query = query.or(
      ["title", "description", "brand", "address", "city", "postal_code"]
        .map((column) => `${column}.ilike.${term}`)
        .join(","),
    );
  }

  const { data, error, count } = await query.returns<ItemRow[]>();
  // Asking for a page past the end returns a range error; treat it as an empty page.
  if (error?.code === "PGRST103") return { items: [], total: 0 };
  if (error) throw error;
  return { items: data.map(toCard), total: count ?? 0 };
}

export type FacetOption = {
  value: string;
  label: string;
  count: number;
  hint?: string; // e.g. postal code range, shown next to the label
  keywords?: string; // extra text the option can be searched by
};

export type ItemFacets = {
  total: number;
  lastCreatedAt: string | null;
  regions: FacetOption[];
  municipalities: FacetOption[];
  categories: FacetOption[];
};

// Filter options with counts across all active items.
export async function getItemFacets(): Promise<ItemFacets> {
  const supabase = await createClient();

  const [itemsResult, categoriesResult] = await Promise.all([
    supabase
      .from("items")
      .select("region, municipality, postal_code, category_id, created_at")
      .eq("status", "active")
      .returns<
        {
          region: string | null;
          municipality: string | null;
          postal_code: string | null;
          category_id: number;
          created_at: string;
        }[]
      >(),
    supabase.from("categories").select("id, name").order("name").returns<{ id: number; name: string }[]>(),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  const rows = itemsResult.data;

  const regionCounts = new Map<string, number>();
  const municipalities = new Map<string, { count: number; postalCodes: Set<string> }>();
  const categoryCounts = new Map<number, number>();

  for (const row of rows) {
    if (row.region) regionCounts.set(row.region, (regionCounts.get(row.region) ?? 0) + 1);
    if (row.municipality) {
      const entry = municipalities.get(row.municipality) ?? { count: 0, postalCodes: new Set() };
      entry.count++;
      if (row.postal_code) entry.postalCodes.add(row.postal_code);
      municipalities.set(row.municipality, entry);
    }
    categoryCounts.set(row.category_id, (categoryCounts.get(row.category_id) ?? 0) + 1);
  }

  const byLabel = (a: FacetOption, b: FacetOption) => a.label.localeCompare(b.label, "da");

  return {
    total: rows.length,
    lastCreatedAt: rows.reduce<string | null>(
      (latest, row) => (!latest || row.created_at > latest ? row.created_at : latest),
      null,
    ),
    regions: [...regionCounts]
      .map(([value, count]) => ({ value, label: value.replace(/^Region /, ""), count }))
      .sort(byLabel),
    municipalities: [...municipalities]
      .map(([value, { count, postalCodes }]) => {
        const codes = [...postalCodes].sort();
        const hint =
          codes.length === 0
            ? undefined
            : codes.length === 1
              ? codes[0]
              : `${codes[0]}–${codes[codes.length - 1]}`;
        return { value, label: value, count, hint, keywords: codes.join(" ") };
      })
      .sort(byLabel),
    categories: categoriesResult.data
      .map((c) => ({ value: String(c.id), label: c.name, count: categoryCounts.get(c.id) ?? 0 }))
      .sort(byLabel),
  };
}

export type ItemDetail = {
  id: string;
  type: ItemType;
  status: "active" | "resolved" | "archived";
  title: string;
  brand: string | null;
  description: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  occurredAt: string;
  category: { id: number; name: string } | null;
  images: { url: string; name: string | null }[];
  ownerId: string | null;
  // Public profile of the user who posted it; null when the item wasn't posted by a user.
  owner: { fullName: string; avatarUrl: string | null; memberSince: string } | null;
};

type ItemDetailRow = {
  id: string;
  type: ItemType;
  status: ItemDetail["status"];
  title: string;
  brand: string | null;
  description: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string;
  user_id: string | null; // prepared for items registered without a user account
  category: { id: number; name: string } | null;
  item_images: { file_path: string; file_name: string | null }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One item with images, category and the owner's public profile. Returns null when it doesn't
// exist or the viewer isn't allowed to see it (RLS hides non-active items from everyone but the owner).
// Wrapped in cache() so generateMetadata and the page share one fetch per request.
export const getItem = cache(async (id: string): Promise<ItemDetail | null> => {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("items")
    .select(
      `id, type, status, title, brand, description, address, postal_code, city, region,
       latitude, longitude, occurred_at, user_id,
       category:categories(id, name),
       item_images(file_path, file_name)`,
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "item_images", ascending: true })
    .maybeSingle<ItemDetailRow>();
  if (error) throw error;
  if (!data) return null;

  type ProfileRow = { full_name: string; avatar_url: string | null; created_at: string };
  let profile: ProfileRow | undefined;
  if (data.user_id) {
    const { data: profiles, error: profileError } = await supabase.rpc("public_profile", {
      profile_id: data.user_id,
    });
    if (profileError) throw profileError;
    profile = (profiles as ProfileRow[])[0];
  }

  return {
    id: data.id,
    type: data.type,
    status: data.status,
    title: data.title,
    brand: data.brand,
    description: data.description,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    region: data.region,
    latitude: data.latitude,
    longitude: data.longitude,
    occurredAt: data.occurred_at,
    category: data.category,
    images: data.item_images.map((img) => ({ url: imageUrl(img.file_path), name: img.file_name })),
    ownerId: data.user_id,
    owner: profile
      ? {
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          memberSince: profile.created_at,
        }
      : null,
  };
});

// Newest active items in the same category, excluding the given item.
export async function getSimilarItems(categoryId: number, excludeId: string, limit = 3) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("items")
    .select(CARD_COLUMNS)
    .eq("status", "active")
    .eq("category_id", categoryId)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "item_images", ascending: true })
    .limit(1, { referencedTable: "item_images" })
    .limit(limit)
    .returns<ItemRow[]>();
  if (error) throw error;
  return data.map(toCard);
}

// All categories, alphabetically — for dropdowns.
export async function getCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name")
    .returns<{ id: number; name: string }[]>();
  if (error) throw error;
  return data.sort((a, b) => a.name.localeCompare(b.name, "da"));
}
