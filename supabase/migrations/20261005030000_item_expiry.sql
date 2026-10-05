-- Opslag udløber efter en periode (6 måneder, se lib/item-expiry.ts) og arkiveres så automatisk.
-- Opretteren får en mail lidt før med et link til at forlænge.

alter table public.items
  add column expires_at timestamptz,
  add column expiry_warned_at timestamptz;  -- hvornår "udløber snart"-mailen blev sendt

update public.items set expires_at = created_at + interval '6 months';

-- Serveren sætter normalt expires_at selv; standardværdien er et sikkerhedsnet.
alter table public.items
  alter column expires_at set not null,
  alter column expires_at set default now() + interval '6 months';

create index items_expiry_idx on public.items (expires_at) where status = 'active';

-- items læses kolonne for kolonne (se 20260928140000_guest_items.sql).
grant select (expires_at) on public.items to anon, authenticated;
