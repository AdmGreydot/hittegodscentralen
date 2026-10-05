-- Log over afsendte mails, så samme afsender ikke kan spamme (kontaktformularer, oprettelse,
-- nulstilling af adgangskode). Kun serveren (secret key) bruger tabellen: RLS er slået til uden policies.

create table public.mail_log (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,  -- hvilken formular, fx 'contact' eller 'reset'
  key_hash    text not null,  -- sha256 af afsenderens IP (eller e-mail); selve værdien gemmes ikke
  created_at  timestamptz not null default now()
);

create index mail_log_lookup_idx on public.mail_log (kind, key_hash, created_at desc);

alter table public.mail_log enable row level security;
