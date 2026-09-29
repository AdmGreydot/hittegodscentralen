import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { filtersToQuery, type ItemFilters } from "../../../lib/item-filters";

// Page numbers to show, e.g. [1, "…", 4, 5, 6, "…", 12]: first, last, and the current page ± 1.
function pageList(page: number, pageCount: number): (number | "…")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  const result: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    const gap = p - (sorted[i - 1] ?? p);
    if (gap === 2) result.push(p - 1); // a gap of one page: show it instead of "…"
    else if (gap > 2) result.push("…");
    result.push(p);
  });
  return result;
}

export default function Pagination({
  filters,
  pageCount,
}: {
  filters: ItemFilters;
  pageCount: number;
}) {
  const { page } = filters;
  // Keeps search, filters and page size — only the page changes.
  const href = (p: number) => `/genstande${filtersToQuery({ ...filters, page: p })}`;

  const box = "grid h-10 min-w-10 place-items-center rounded-lg px-3 text-sm transition-colors";
  const idle = `${box} border border-zinc-200 bg-white text-brand-black hover:border-brand-brown/40`;
  const disabled = `${box} border border-zinc-200 bg-white text-zinc-300`;

  return (
    <nav aria-label="Sider" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={idle} aria-label="Forrige side">
          <ChevronLeft size={18} aria-hidden />
        </Link>
      ) : (
        <span className={disabled} aria-hidden>
          <ChevronLeft size={18} />
        </span>
      )}

      {pageList(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-zinc-400" aria-hidden>
            …
          </span>
        ) : p === page ? (
          <span
            key={p}
            aria-current="page"
            className={`${box} bg-brand-brown font-medium text-white`}
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={href(p)} className={idle} aria-label={`Side ${p}`}>
            {p}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link href={href(page + 1)} className={idle} aria-label="Næste side">
          <ChevronRight size={18} aria-hidden />
        </Link>
      ) : (
        <span className={disabled} aria-hidden>
          <ChevronRight size={18} />
        </span>
      )}
    </nav>
  );
}
