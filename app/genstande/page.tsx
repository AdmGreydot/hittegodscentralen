import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getItemFacets, searchItems } from "../../lib/items";
import { filtersToQuery, parseFilters } from "../../lib/item-filters";
import ItemCard from "../components/ItemCard";
import FilterSidebar from "./_components/FilterSidebar";
import FiltersProvider, { PendingResults } from "./_components/FiltersProvider";
import ItemSearch from "./_components/ItemSearch";
import Pagination from "./_components/Pagination";
import PerPageSelect from "./_components/PerPageSelect";

export const metadata: Metadata = {
  title: "Tabte & fundne genstande · Hittegodscentralen",
  description: "Søg i tabte og fundne genstande i hele Danmark.",
};

// "opdateret i dag" / "i går" / "for 3 dage siden"
function updatedLabel(iso: string | null) {
  if (!iso) return null;
  const day = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(date);
  const days = Math.round(
    (Date.parse(day(new Date())) - Date.parse(day(new Date(iso)))) / 86_400_000,
  );
  if (days <= 0) return "opdateret i dag";
  if (days === 1) return "opdateret i går";
  return `opdateret for ${days} dage siden`;
}

export default async function GenstandePage({ searchParams }: PageProps<"/genstande">) {
  const filters = parseFilters(await searchParams);
  const [facets, results] = await Promise.all([getItemFacets(), searchItems(filters)]);
  const pageCount = Math.max(1, Math.ceil(results.total / filters.perPage));

  // A page past the end (old link, or fewer results after a filter change): go to page 1.
  if (filters.page > 1 && results.items.length === 0) {
    redirect(`/genstande${filtersToQuery({ ...filters, page: 1 })}`);
  }

  const firstShown = (filters.page - 1) * filters.perPage + 1;
  const lastShown = firstShown + results.items.length - 1;
  const updated = updatedLabel(facets.lastCreatedAt);

  return (
    <FiltersProvider filters={filters}>
      <main className="flex-1 bg-zinc-100">
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <h1 className="font-serif text-4xl font-bold text-brand-brown sm:text-5xl">
              Tabte &amp; fundne genstande
            </h1>
            <p className="mt-2 font-light text-zinc-500">
              {facets.total} {facets.total === 1 ? "genstand" : "genstande"} registreret
              {updated && ` · ${updated}`}
            </p>
            <ItemSearch />
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row">
          <FilterSidebar facets={facets} />

          <section className="min-w-0 flex-1" aria-label="Resultater">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-zinc-500">
                {pageCount > 1 && `Viser ${firstShown}–${lastShown} af `}
                <span className="font-semibold text-brand-black">{results.total}</span>{" "}
                {results.total === 1 ? "genstand" : "genstande"}
                {filters.q && (
                  <>
                    {" "}
                    for “<span className="text-brand-black">{filters.q}</span>”
                  </>
                )}
              </p>
              <PerPageSelect />
            </div>

            <PendingResults>
              {results.items.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {results.items.map((item) => (
                    <ItemCard key={item.id} item={item} showDate />
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-white px-6 py-16 text-center">
                  <p className="font-medium text-brand-black">Ingen genstande matcher din søgning</p>
                  <p className="mt-1 text-zinc-500">Prøv at fjerne nogle filtre eller søge bredere.</p>
                  <Link
                    href="/genstande"
                    scroll={false}
                    className="mt-6 inline-block rounded-lg border-2 border-brand-brown px-5 py-2 font-medium text-brand-brown transition-colors hover:bg-brand-brown hover:text-white"
                  >
                    Nulstil alle filtre
                  </Link>
                </div>
              )}

              {pageCount > 1 && (
                <Pagination filters={filters} pageCount={pageCount} />
              )}
            </PendingResults>
          </section>
        </div>
      </main>
    </FiltersProvider>
  );
}
