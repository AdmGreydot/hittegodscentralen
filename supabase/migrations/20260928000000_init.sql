-- Hittegodscentralen – initial schema
-- Kør i Supabase SQL Editor, eller med `supabase db push` via Supabase CLI.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.item_type as enum ('lost', 'found');
create type public.item_status as enum ('active', 'resolved', 'archived');

-- ---------------------------------------------------------------------------
-- Tabeller
-- ---------------------------------------------------------------------------

create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id    smallint generated always as identity primary key,
  name  text not null unique
);

create table public.items (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  category_id        smallint not null references public.categories (id) on delete restrict,
  type               public.item_type not null,
  title              text not null,
  brand              text,
  description        text,
  status             public.item_status not null default 'active',
  status_changed_at  timestamptz not null default now(),
  status_note        text,
  latitude           double precision,
  longitude          double precision,
  address            text,
  postal_code        text,
  city               text,
  municipality       text,
  region             text,
  country_code       text not null default 'DK',
  occurred_at        timestamptz not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.item_images (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items (id) on delete cascade,
  file_path   text not null,
  file_name   text,
  created_at  timestamptz not null default now()
);

create index items_created_at_idx on public.items (created_at desc);
create index items_type_status_idx on public.items (type, status);
create index items_user_id_idx on public.items (user_id);
create index items_category_id_idx on public.items (category_id);
create index item_images_item_id_idx on public.item_images (item_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Opret en profil i public.users, når en bruger signer op.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hold updated_at og status_changed_at opdateret automatisk.
create function public.handle_item_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger on_item_updated
  before update on public.items
  for each row execute function public.handle_item_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;

-- users: profiler indeholder telefonnummer, så kun ejeren kan se og rette sin egen.
create policy "Brugere kan se egen profil"
  on public.users for select to authenticated
  using ((select auth.uid()) = id);

create policy "Brugere kan rette egen profil"
  on public.users for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- categories: alle kan læse.
create policy "Alle kan se kategorier"
  on public.categories for select to anon, authenticated
  using (true);

-- items: alle kan se aktive opslag; ejeren kan se og styre sine egne.
create policy "Alle kan se aktive opslag"
  on public.items for select to anon, authenticated
  using (status = 'active' or (select auth.uid()) = user_id);

create policy "Brugere kan oprette egne opslag"
  on public.items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Brugere kan rette egne opslag"
  on public.items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Brugere kan slette egne opslag"
  on public.items for delete to authenticated
  using ((select auth.uid()) = user_id);

-- item_images: synlige når opslaget er synligt; kun opslagets ejer kan tilføje/slette.
create policy "Alle kan se billeder til synlige opslag"
  on public.item_images for select to anon, authenticated
  using (exists (select 1 from public.items i where i.id = item_id));

create policy "Ejere kan tilføje billeder"
  on public.item_images for insert to authenticated
  with check (exists (
    select 1 from public.items i
    where i.id = item_id and i.user_id = (select auth.uid())
  ));

create policy "Ejere kan slette billeder"
  on public.item_images for delete to authenticated
  using (exists (
    select 1 from public.items i
    where i.id = item_id and i.user_id = (select auth.uid())
  ));

-- ---------------------------------------------------------------------------
-- Storage: billeder gemmes i bucket "item-images" under "<user_id>/<fil>"
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "Alle kan se billeder"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'item-images');

create policy "Brugere kan uploade i egen mappe"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Brugere kan slette i egen mappe"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Seed: kategorier
-- ---------------------------------------------------------------------------

insert into public.categories (name) values
  ('Elektronik'),
  ('Nøgler'),
  ('Tøj'),
  ('Tasker'),
  ('Dokumenter'),
  ('Smykker'),
  ('Andet');
