"use client";

import { useEffect, useRef } from "react";
import { useFilters } from "./FiltersProvider";

const DEBOUNCE_MS = 350;

export default function ItemSearch() {
  const { filters, setFilters } = useFilters();
  const inputRef = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the box in sync when the search changes elsewhere (e.g. "Nulstil filtre"),
  // but never overwrite what the user is typing.
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input) input.value = filters.q;
  }, [filters.q]);

  useEffect(() => () => clearTimeout(timeout.current), []);

  function search(value: string) {
    clearTimeout(timeout.current);
    if (value.trim() !== filters.q) setFilters({ q: value.trim() });
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        search(inputRef.current?.value ?? "");
      }}
      className="mt-8 max-w-lg"
    >
      <input
        ref={inputRef}
        type="search"
        defaultValue={filters.q}
        onChange={(e) => {
          const value = e.target.value;
          clearTimeout(timeout.current);
          timeout.current = setTimeout(() => search(value), DEBOUNCE_MS);
        }}
        placeholder="Søg genstand, sted..."
        aria-label="Søg genstand eller sted"
        className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-100 px-10 text-brand-black placeholder:text-zinc-400 outline-none transition-colors focus:border-brand-brown/40 focus:bg-white"
      />
    </form>
  );
}
