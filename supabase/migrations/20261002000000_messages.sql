-- Beskeder mellem brugere om en genstand.
-- En samtale er altid mellem annoncens ejer og én anden bruger, om én genstand.

create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.items (id) on delete cascade,
  owner_id         uuid not null references auth.users (id) on delete cascade,  -- annoncens ejer
  starter_id       uuid not null references auth.users (id) on delete cascade,  -- den der skrev først
  created_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  unique (item_id, starter_id),
  check (owner_id <> starter_id)
);

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references auth.users (id) on delete cascade,
  body             text not null check (char_length(body) between 1 and 2000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index conversations_owner_id_idx on public.conversations (owner_id, last_message_at desc);
create index conversations_starter_id_idx on public.conversations (starter_id, last_message_at desc);
create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Hold samtalens last_message_at opdateret, så listen kan sorteres efter seneste besked.
create function public.handle_new_message()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Deltagere kan se egne samtaler"
  on public.conversations for select to authenticated
  using ((select auth.uid()) in (owner_id, starter_id));

-- Man kan kun starte en samtale om en aktiv genstand, og owner_id skal være genstandens ejer.
create policy "Brugere kan starte samtaler"
  on public.conversations for insert to authenticated
  with check (
    starter_id = (select auth.uid())
    and exists (
      select 1 from public.items i
      where i.id = item_id and i.user_id = owner_id and i.status = 'active'
    )
  );

create policy "Deltagere kan se beskeder"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.owner_id, c.starter_id)
  ));

create policy "Deltagere kan skrive beskeder"
  on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and read_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.owner_id, c.starter_id)
    )
  );

-- Beskeder må ikke rettes direkte (så ingen kan ændre teksten); læst-markering sker via funktionen.
create function public.mark_conversation_read(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.messages m
  set read_at = now()
  from public.conversations c
  where m.conversation_id = target
    and c.id = m.conversation_id
    and (select auth.uid()) in (c.owner_id, c.starter_id)
    and m.sender_id <> (select auth.uid())
    and m.read_at is null;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Den indloggede brugers samtaler med genstand, modpart, seneste besked og antal ulæste.
-- security definer, fordi modpartens navn ligger i public.users (kun læsbar for ejeren),
-- og fordi genstanden skal kunne vises, selvom den er markeret som løst.
create function public.my_conversations()
returns table (
  id uuid,
  item_id uuid,
  item_title text,
  item_type public.item_type,
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

-- ---------------------------------------------------------------------------
-- Realtime: nye beskeder sendes live til deltagerne (RLS gælder også her).
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;
