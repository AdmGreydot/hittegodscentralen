-- Hvornår modtageren fik en påmindelse om, at beskeden stadig er ulæst. Sættes af serveren,
-- så hver besked højst giver én påmindelse.

alter table public.messages add column reminded_at timestamptz;

create index messages_unread_reminder_idx on public.messages (created_at)
  where read_at is null and reminded_at is null;
