"use client";

import { PER_PAGE_OPTIONS } from "../../../lib/item-filters";
import { useFilters } from "./FiltersProvider";

export default function PerPageSelect() {
  const { filters, setFilters } = useFilters();

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-500">
      Vis
      <select
        value={filters.perPage}
        onChange={(e) => setFilters({ perPage: Number(e.target.value) })}
        className="h-9 cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 text-brand-black outline-none focus:border-brand-brown/40"
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      pr. side
    </label>
  );
}
