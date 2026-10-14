-- Opslag oprettet uden at være logget ind hører til den konto, der har samme e-mail. Så kan de
-- rettes og følges fra profilen. Det gælder både opslag fra før kontoen blev oprettet og opslag
-- oprettet senere uden login. Kun bekræftede e-mails tæller, så man ikke kan få andres opslag
-- ved at oprette en konto med deres e-mail.

-- 1. Når en konto får bekræftet sin e-mail: tag de opslag, der allerede ligger med den e-mail.
create function public.claim_guest_items()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and new.email is not null and (
    tg_op = 'INSERT'
    or old.email_confirmed_at is null
    or old.email is distinct from new.email
  ) then
    update public.items
    set user_id = new.id, contact_email = null
    where user_id is null and lower(contact_email) = lower(new.email);
  end if;
  return new;
end;
$$;

revoke execute on function public.claim_guest_items() from public;

-- Ved oprettelse dækker brugere, der er bekræftet med det samme (fx de importerede gamle brugere).
create trigger on_auth_user_claim_items
  after insert or update of email_confirmed_at, email on auth.users
  for each row execute function public.claim_guest_items();

-- 2. Når et opslag oprettes uden login med en e-mail, der allerede har en konto: sæt det på kontoen.
create function public.assign_guest_item_owner()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  owner uuid;
begin
  if new.user_id is null and new.contact_email is not null then
    select u.id into owner
    from auth.users u
    where lower(u.email) = lower(new.contact_email) and u.email_confirmed_at is not null
    limit 1;
    if owner is not null then
      new.user_id := owner;
      new.contact_email := null;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.assign_guest_item_owner() from public;

create trigger on_item_assign_owner
  before insert or update of contact_email on public.items
  for each row execute function public.assign_guest_item_owner();

-- 3. Opslag fra før denne migration, hvor der allerede findes en bekræftet konto med samme e-mail.
update public.items i
set user_id = u.id, contact_email = null
from auth.users u
where i.user_id is null
  and u.email_confirmed_at is not null
  and lower(i.contact_email) = lower(u.email);
