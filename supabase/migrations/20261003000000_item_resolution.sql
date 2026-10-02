-- Hvordan en annonce endte, når ejeren markerer den som afsluttet.
--   returned    tabt: fik den igen / fundet: ejeren fik den
--   found_self  tabt: fandt den selv
--   gave_up     tabt: opgivet (annoncen arkiveres)
--   police      fundet: afleveret til politiet/hittegodskontor
--   other       fundet: andet

create type public.item_resolution as enum ('returned', 'found_self', 'gave_up', 'police', 'other');

alter table public.items
  add column resolution public.item_resolution,
  -- Samtalen med den, genstanden blev afleveret til/fra, når det skete via Hittegodscentralen.
  add column resolved_conversation_id uuid references public.conversations (id) on delete set null;

-- Læseadgang på items gives kolonne for kolonne (se 20260928140000_guest_items.sql).
grant select (resolution, resolved_conversation_id) on public.items to anon, authenticated;

-- my_conversations() får genstandens status, og om brugeren selv ejer genstanden,
-- så chatten kan vise "Markér som afleveret" for ejeren og en note, når den er afsluttet.
drop function public.my_conversations();

create function public.my_conversations()
returns table (
  id uuid,
  item_id uuid,
  item_title text,
  item_type public.item_type,
  item_status public.item_status,
  i_own_item boolean,
  other_id uuid,
  other_name text,
  last_body text,
  last_sender_id uuid,
  last_message_at timestamptz,
  unread integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.item_id,
    i.title,
    i.type,
    i.status,
    c.owner_id = (select auth.uid()),
    case when c.owner_id = (select auth.uid()) then c.starter_id else c.owner_id end,
    coalesce(other.full_name, ''),
    last.body,
    last.sender_id,
    c.last_message_at,
    (
      select count(*)::integer from public.messages m
      where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.read_at is null
    )
  from public.conversations c
  join public.items i on i.id = c.item_id
  left join public.users other
    on other.id = case when c.owner_id = (select auth.uid()) then c.starter_id else c.owner_id end
  left join lateral (
    select m.body, m.sender_id from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) last on true
  where (select auth.uid()) in (c.owner_id, c.starter_id)
  order by c.last_message_at desc;
$$;

revoke execute on function public.my_conversations() from public;
grant execute on function public.my_conversations() to authenticated;
