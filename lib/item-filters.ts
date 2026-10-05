// Filters for /genstande, stored in the URL. Shared by server and client, so no server-only imports.
import type { ItemType } from "./item-card";

export type ItemFilters = {
  q: string;
  type: ItemType | null;
  regions: string[];
  municipalities: string[];
  categories: number[];
  from: string | null; // YYYY-MM-DD, compared against occurred_at
  to: string | null; // YYYY-MM-DD, inclusive
  page: number;
  perPage: number;
};

export const PER_PAGE_OPTIONS = [25, 50, 75, 100];
export const DEFAULT_PER_PAGE = PER_PAGE_OPTIONS[0];

type SearchParams = Record<string, string | string[] | undefined>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function all(value: string | string[] | undefined) {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function first(value: string | string[] | undefined) {
  return all(value)[0] ?? null;
}

export function parseFilters(params: SearchParams): ItemFilters {
  const type = first(params.type);
  const from = first(params.fra);
  const to = first(params.til);
  const page = Number(first(params.side));
  const perPage = Number(first(params.antal));

  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    type: type === "lost" || type === "found" ? type : null,
    regions: all(params.region),
    municipalities: all(params.kommune),
    categories: all(params.kategori).map(Number).filter(Number.isInteger),
    from: from && DATE_RE.test(from) ? from : null,
    to: to && DATE_RE.test(to) ? to : null,
    page: Number.isInteger(page) && page > 1 ? page : 1,
    perPage: PER_PAGE_OPTIONS.includes(perPage) ? perPage : DEFAULT_PER_PAGE,
  };
}

export function filtersToQuery(filters: ItemFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  filters.regions.forEach((r) => params.append("region", r));
  filters.municipalities.forEach((m) => params.append("kommune", m));
  filters.categories.forEach((c) => params.append("kategori", String(c)));
  if (filters.from) params.set("fra", filters.from);
  if (filters.to) params.set("til", filters.to);
  if (filters.perPage !== DEFAULT_PER_PAGE)
    params.set("antal", String(filters.perPage));
  if (filters.page > 1) params.set("side", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const EMPTY_FILTERS: ItemFilters = {
  q: "",
  type: null,
  regions: [],
  municipalities: [],
  categories: [],
  from: null,
  to: null,
  page: 1,
  perPage: DEFAULT_PER_PAGE,
};

// True when any filter is set. Page and page size don't count as filters.
export function hasActiveFilters(filters: ItemFilters) {
  return (
    filtersToQuery({ ...filters, page: 1, perPage: DEFAULT_PER_PAGE }) !== ""
  );
}
