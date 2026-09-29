"use client";

import { useState, type ReactNode } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";
import type { FacetOption, ItemFacets } from "../../../lib/items";
import { hasActiveFilters, EMPTY_FILTERS, type ItemFilters } from "../../../lib/item-filters";
import { useFilters } from "./FiltersProvider";

const STATUS_OPTIONS: { value: ItemFilters["type"]; label: string }[] = [
  { value: null, label: "Alle genstande" },
  { value: "lost", label: "Tabt" },
  { value: "found", label: "Fundet" },
];

const DATE_PRESETS = [
  { days: 0, label: "I dag" },
  { days: 7, label: "Seneste 7 dage" },
  { days: 30, label: "Seneste 30 dage" },
];

// Today's date in Denmark as YYYY-MM-DD.
function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() - offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(date);
}

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function FilterSidebar({ facets }: { facets: ItemFacets }) {
  const { filters, setFilters } = useFilters();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount =
    (filters.type ? 1 : 0) +
    filters.regions.length +
    filters.municipalities.length +
    filters.categories.length +
    (filters.from || filters.to ? 1 : 0);

  return (
    <aside className="lg:w-72 lg:shrink-0">
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 font-medium text-brand-black lg:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={18} aria-hidden />
          Filtrér{activeCount > 0 && ` (${activeCount})`}
        </span>
        {mobileOpen ? <X size={18} aria-hidden /> : null}
      </button>

      <div
        className={`${mobileOpen ? "mt-3 block" : "hidden"} overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:block`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
          <h2 className="font-medium text-brand-black">Filtrér</h2>
          {hasActiveFilters({ ...filters, q: "" }) && (
            <button
              type="button"
              onClick={() => setFilters({ ...EMPTY_FILTERS, q: filters.q, perPage: filters.perPage })}
              className="text-sm text-zinc-500 underline-offset-2 hover:text-brand-black hover:underline"
            >
              Nulstil filtre
            </button>
          )}
        </div>

        <FilterSection title="Status">
          <div className="space-y-1">
            {STATUS_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.label}
                selected={filters.type === option.value}
                onClick={() => setFilters({ type: option.value })}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </FilterSection>

        <DateSection />

        <FilterSection title="Region">
          <CheckboxList
            options={facets.regions}
            selected={filters.regions}
            onToggle={(value) => setFilters({ regions: toggle(filters.regions, value) })}
          />
        </FilterSection>

        <FilterSection title="By / postnummer">
          <SearchableCheckboxList
            options={facets.municipalities}
            selected={filters.municipalities}
            onToggle={(value) =>
              setFilters({ municipalities: toggle(filters.municipalities, value) })
            }
            placeholder="Søg by eller postnr..."
            emptyLabel="Ingen byer matcher"
          />
        </FilterSection>

        <FilterSection title="Kategori" last>
          <SearchableCheckboxList
            options={facets.categories}
            selected={filters.categories.map(String)}
            onToggle={(value) =>
              setFilters({ categories: toggle(filters.categories, Number(value)) })
            }
            placeholder="Søg kategori..."
            emptyLabel="Ingen kategorier matcher"
          />
        </FilterSection>
      </div>
    </aside>
  );
}

function DateSection() {
  const { filters, setFilters } = useFilters();
  const max = today();
  const activePreset = !filters.to
    ? DATE_PRESETS.find((preset) => filters.from === today(preset.days))
    : undefined;

  return (
    <FilterSection title="Dato" description="Hvornår genstanden blev tabt eller fundet">
      <div className="space-y-1">
        <ChoiceButton
          selected={!filters.from && !filters.to}
          onClick={() => setFilters({ from: null, to: null })}
        >
          Alle datoer
        </ChoiceButton>
        {DATE_PRESETS.map((preset) => (
          <ChoiceButton
            key={preset.days}
            selected={activePreset === preset}
            onClick={() => setFilters({ from: today(preset.days), to: null })}
          >
            {preset.label}
          </ChoiceButton>
        ))}
      </div>

      <p className="mt-5 mb-2 text-sm text-zinc-500">Eller vælg en periode</p>
      <div className="grid grid-cols-2 gap-2">
        <DateInput
          label="Fra"
          value={filters.from}
          max={filters.to ?? max}
          onChange={(from) => setFilters({ from })}
        />
        <DateInput
          label="Til"
          value={filters.to}
          min={filters.from ?? undefined}
          max={max}
          onChange={(to) => setFilters({ to })}
        />
      </div>
    </FilterSection>
  );
}

function DateInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string | null;
  min?: string;
  max?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </span>
      <input
        type="date"
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 text-sm text-brand-black outline-none focus:border-brand-brown/40 focus:bg-white"
      />
    </label>
  );
}

// Checkbox list with its own search box. Long lists scroll inside a fixed height.
function SearchableCheckboxList({
  options,
  selected,
  onToggle,
  placeholder,
  emptyLabel,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || o.keywords?.includes(q))
    : options;

  return (
    <>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder.replace(/\.+$/, "")}
        className="mb-3 h-10 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-brand-black placeholder:text-zinc-400 outline-none focus:border-brand-brown/40 focus:bg-white"
      />
      {matches.length > 0 ? (
        <div className="max-h-66 overflow-y-auto overscroll-contain pr-1">
          <CheckboxList options={matches} selected={selected} onToggle={onToggle} />
        </div>
      ) : (
        <p className="py-2 text-sm text-zinc-400">
          {emptyLabel} “{query}”.
        </p>
      )}
    </>
  );
}

function FilterSection({
  title,
  description,
  last = false,
  children,
}: {
  title: string;
  description?: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`px-6 py-6 ${last ? "" : "border-b border-zinc-200"}`}>
      <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-500">{title}</h3>
      {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left transition-colors ${
        selected
          ? "bg-brand-brown font-medium text-white"
          : "text-brand-black/80 hover:bg-zinc-100"
      }`}
    >
      {children}
      {selected && <Check size={18} aria-hidden />}
    </button>
  );
}

function CheckboxList({
  options,
  selected,
  onToggle,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {options.map((option) => (
        <li key={option.value}>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-brand-black/80 hover:text-brand-black">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="size-4.5 shrink-0 cursor-pointer accent-brand-brown"
            />
            <span className="flex-1">{option.label}</span>
            {option.hint && (
              <span className="font-mono text-xs text-zinc-300">{option.hint}</span>
            )}
            <span className="w-6 text-right text-sm text-zinc-300">{option.count}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
