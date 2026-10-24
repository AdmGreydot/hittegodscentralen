-- Categories are switched off for now (test): new items are saved without one.
alter table public.items alter column category_id drop not null;
