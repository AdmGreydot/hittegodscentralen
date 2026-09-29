import { unstable_rethrow } from "next/navigation";
import { getLatestItems } from "../../lib/items";
import LatestItemsGrid from "./LatestItemsGrid";

const LIMIT = 6;

async function loadItems() {
  try {
    // Fetch each filter up front so switching tabs is instant and each tab shows up to 6.
    const [all, lost, found] = await Promise.all([
      getLatestItems(LIMIT),
      getLatestItems(LIMIT, "lost"),
      getLatestItems(LIMIT, "found"),
    ]);
    return { all, lost, found };
  } catch (error) {
    unstable_rethrow(error);
    // Don't take the whole frontpage down if the database is unavailable.
    console.error("Kunne ikke hente seneste genstande:", error);
    return null;
  }
}

export default async function LatestItems() {
  const items = await loadItems();

  return (
    <section id="indhold" className="bg-zinc-100 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {items ? (
          <LatestItemsGrid items={items} />
        ) : (
          <p className="rounded-2xl bg-white px-6 py-16 text-center text-zinc-500">
            Genstandene kunne ikke hentes lige nu. Prøv igen om lidt.
          </p>
        )}
      </div>
    </section>
  );
}
