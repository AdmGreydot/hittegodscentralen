-- Offentlig visning af en brugerprofil (fx annoncøren på en genstand).
-- public.users kan kun læses af ejeren, fordi den indeholder telefonnummer,
-- så denne funktion udleverer kun de felter, der må ses af alle.

create function public.public_profile(profile_id uuid)
returns table (full_name text, avatar_url text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.full_name, u.avatar_url, u.created_at
  from public.users u
  where u.id = profile_id;
$$;

revoke execute on function public.public_profile(uuid) from public;
grant execute on function public.public_profile(uuid) to anon, authenticated;
