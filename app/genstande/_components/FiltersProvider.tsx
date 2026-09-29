"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { filtersToQuery, type ItemFilters } from "../../../lib/item-filters";

type FiltersContextValue = {
  filters: ItemFilters;
  setFilters: (patch: Partial<ItemFilters>) => void;
  pending: boolean;
};

const FiltersContext = createContext<FiltersContextValue | null>(null);

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) throw new Error("useFilters must be used inside <FiltersProvider>");
  return context;
}

// Filters live in the URL; changing one navigates and the server page re-renders the results.
export default function FiltersProvider({
  filters,
  children,
}: {
  filters: ItemFilters;
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setFilters(patch: Partial<ItemFilters>) {
    // Any filter change starts over on page 1.
    const next = { ...filters, page: 1, ...patch };
    startTransition(() => router.push(`/genstande${filtersToQuery(next)}`, { scroll: false }));
  }

  return (
    <FiltersContext.Provider value={{ filters, setFilters, pending }}>
      {children}
    </FiltersContext.Provider>
  );
}

// Dims the results while new ones load.
export function PendingResults({ children }: { children: ReactNode }) {
  const { pending } = useFilters();
  return (
    <div
      aria-busy={pending}
      className={`transition-opacity duration-200 ${pending ? "opacity-50" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
