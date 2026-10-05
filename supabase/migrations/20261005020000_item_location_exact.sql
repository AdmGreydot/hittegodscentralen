-- Om latitude/longitude er det præcise sted (fra "Brug min lokation" eller kortet) eller bare
-- postnummerets midte. Kortet på opslaget viser en nål for et præcist sted og et område ellers.

alter table public.items add column location_exact boolean not null default false;

-- items læses kolonne for kolonne (se 20260928140000_guest_items.sql).
grant select (location_exact) on public.items to anon, authenticated;
