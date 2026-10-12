-- Brugere kan oprette nye kategorier, når de opretter et opslag (se app/opret/actions.ts).
-- Navnet renses på serveren (trim, stort begyndelsesbogstav) før det gemmes.

alter table public.categories
  add column user_created boolean not null default false,  -- oprettet af en bruger, ikke af os
  add column created_at timestamptz not null default now();

-- Samme kategori uanset store og små bogstaver: "Nøgler" og "nøgler" kan ikke begge findes.
create unique index categories_name_lower_idx on public.categories (lower(name));

-- Kun serveren (secret key) opretter kategorier; brugere kan stadig kun læse dem.
