-- Retter mail_log i databaser, der fik den første udgave af 20261005000000_mail_log.sql: der hed
-- kolonnen ip_hash, og en check-regel tillod kun 'contact' og 'item'. Koden bruger key_hash og
-- flere typer (signup, reset, category ...), så spambeskyttelsen fejlede stille.
-- Gør intet i databaser, der allerede har den rettede udgave.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'mail_log' and column_name = 'ip_hash'
  ) then
    alter table public.mail_log rename column ip_hash to key_hash;
  end if;
end $$;

alter table public.mail_log drop constraint if exists mail_log_kind_check;
