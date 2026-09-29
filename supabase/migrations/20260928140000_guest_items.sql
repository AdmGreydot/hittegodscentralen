-- Genstande kan oprettes uden bruger. Så er user_id null, og kontakten går til contact_email.

alter table public.items
  alter column user_id drop not null,
  add column contact_email text;

-- En genstand skal have enten en bruger eller en kontakt-e-mail.
alter table public.items
  add constraint items_owner_or_email
  check (user_id is not null or contact_email is not null);

-- contact_email må aldrig kunne læses via API'et — kontakt formidles gennem Hittegodscentralen.
-- Læseadgang gives derfor kolonne for kolonne i stedet for til hele tabellen.
-- NB: nye kolonner på items skal tilføjes her, før de kan læses.
revoke select on public.items from anon, authenticated;
grant select (
  id, user_id, category_id, type, title, brand, description, status, status_changed_at,
  status_note, latitude, longitude, address, postal_code, city, municipality, region,
  country_code, occurred_at, created_at, updated_at
) on public.items to anon, authenticated;
