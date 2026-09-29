// Shared between server data fetching and client components — keep free of server-only imports.

export type ItemType = "lost" | "found";

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
