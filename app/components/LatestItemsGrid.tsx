"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ItemCard as ItemCardData } from "../../lib/item-card";
import ItemCard from "./ItemCard";

type Filter = "all" | "lost" | "found";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Alle" },
  { value: "lost", label: "Tabt" },
  { value: "found", label: "Fundet" },
];

export default function LatestItemsGrid({
  items,
}: {
  items: Record<Filter, ItemCardData[]>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const count = items[filter].length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h2 className="font-serif text-3xl font-bold text-brand-black sm:text-4xl">
            Seneste genstande
          </h2>
          <p className="mt-1 text-lg font-light text-zinc-500">
            {count} {count === 1 ? "resultat" : "resultater"}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filtrér genstande"
          className="flex rounded-xl border border-zinc-200 bg-white p-1.5"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-5 py-2 text-lg transition-colors ${
                filter === f.value
                  ? "bg-brand-brown font-medium text-white"
                  : "text-zinc-500 hover:text-brand-black"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {count > 0 ? (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items[filter].map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-2xl bg-white px-6 py-16 text-center text-zinc-500">
          Der er ingen genstande her endnu.
        </p>
      )}

      <div className="mt-14 flex justify-center">
        <Link
          href="/genstande"
          className="flex items-center gap-3 rounded-xl border-2 border-brand-brown px-9 py-3.5 text-lg font-medium text-brand-brown transition-colors hover:bg-brand-brown hover:text-white"
        >
          Se alle genstande
          <ArrowRight size={20} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </>
  );
}
