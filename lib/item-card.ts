// Shared between server data fetching and client components. Keep free of server-only imports.

export type ItemType = "lost" | "found";
export type ItemStatus = "active" | "resolved" | "archived";

// How an item ended when its poster marked it as done. See the item_resolution enum.
export type ItemResolution = "returned" | "found_self" | "gave_up" | "police" | "other";

// Which answers fit which kind of item. gave_up archives the item; the rest mark it resolved.
export const RESOLUTION_OPTIONS: Record<ItemType, { value: ItemResolution; label: string }[]> = {
  lost: [
    { value: "returned", label: "Ja, jeg har fået den igen" },
    { value: "found_self", label: "Ja, jeg fandt den selv" },
    { value: "gave_up", label: "Nej, jeg har opgivet at finde den" },
  ],
  found: [
    { value: "returned", label: "Ejeren har fået den" },
    { value: "police", label: "Afleveret til politiet eller et hittegodskontor" },
    { value: "other", label: "Andet" },
  ],
};

export function isResolutionFor(type: ItemType, resolution: ItemResolution) {
  return RESOLUTION_OPTIONS[type].some((o) => o.value === resolution);
}

export type ItemCard = {
  id: string;
  type: ItemType;
  title: string;
  description: string | null;
  location: string | null;
  occurredAt: string;
  imageUrl: string;
};

export const PLACEHOLDER_IMAGE = "/placeholder-item.svg";

const dateFormat = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

// "17. sep 2026"
export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso)).replace(/\.(?= \d{4})/, "");
}
