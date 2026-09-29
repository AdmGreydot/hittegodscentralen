-- Hittegodscentralen – testdata
-- Kør efter migrationen i Supabase SQL Editor. Kan køres flere gange.
--
-- Testbrugere (adgangskode for begge: Test1234!)
--   anna@test.dk
--   jonas@test.dk
--
-- Billeder: file_path er normalt en sti i bucket'en "item-images".
-- Testdata bruger fulde Unsplash-URL'er, så der ikke skal uploades filer.

-- ---------------------------------------------------------------------------
-- Brugere
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated', 'anna@test.dk',
    extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{"full_name": "Anna Jensen"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated', 'jonas@test.dk',
    extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{"full_name": "Jonas Nielsen"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.id in ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002')
on conflict (provider_id, provider) do nothing;

update public.users set phone = '+45 12 34 56 78'
where id = 'a0000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- Genstande
-- created_at er spredt ud, så "seneste 6" kan testes. Den løste genstand
-- (status = resolved) må ikke blive vist på forsiden.
-- ---------------------------------------------------------------------------

insert into public.items (
  id, user_id, category_id, type, title, brand, description, status,
  address, postal_code, city, municipality, region, latitude, longitude,
  occurred_at, created_at
)
values
  (
    'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
    (select id from public.categories where name = 'Smykker'), 'lost',
    'Ring', null, 'Har tabt min ring nær Togbulmens anskaj 64.', 'active',
    'Togbulmens anskaj 64', '2100', 'København Ø', 'København', 'Region Hovedstaden', 55.7040, 12.5900,
    now() - interval '1 day', now() - interval '10 minutes'
  ),
  (
    'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
    (select id from public.categories where name = 'Elektronik'), 'lost',
    'Hvid JBL in-ear etui', 'JBL', 'Hvide Wave Beam 2 Bluetooth-høretelefoner fra JBL.', 'active',
    'Østerbro, bus 1a', '2100', 'København Ø', 'København', 'Region Hovedstaden', 55.7000, 12.5770,
    now() - interval '2 days', now() - interval '2 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
    (select id from public.categories where name = 'Tasker'), 'lost',
    'Mistet blå kuffert', null, 'Blå kuffert, håndbagage størrelse. Et plastisk stempel er slidt af.', 'active',
    'Næstved Station', '4700', 'Næstved', 'Næstved', 'Region Sjælland', 55.2290, 11.7610,
    now() - interval '3 days', now() - interval '5 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
    (select id from public.categories where name = 'Nøgler'), 'found',
    'Nøglebundt med rød rem', null, 'Tre nøgler og en lille lygte på en rød rem. Fundet på en bænk.', 'active',
    'Kongens Have', '1307', 'København K', 'København', 'Region Hovedstaden', 55.6850, 12.5790,
    now() - interval '1 day', now() - interval '1 day'
  ),
  (
    'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
    (select id from public.categories where name = 'Elektronik'), 'found',
    'iPhone uden cover', 'Apple', 'iPhone uden cover. Skærmen har en lille revne i hjørnet.', 'active',
    'Aarhus H', '8000', 'Aarhus C', 'Aarhus', 'Region Midtjylland', 56.1500, 10.2040,
    now() - interval '2 days', now() - interval '2 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002',
    (select id from public.categories where name = 'Tasker'), 'lost',
    'Grå rygsæk', 'Fjällräven', 'Grå Kånken-rygsæk med computer og penalhus.', 'active',
    null, '5000', 'Odense C', 'Odense', 'Region Syddanmark', null, null,
    now() - interval '4 days', now() - interval '3 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
    (select id from public.categories where name = 'Elektronik'), 'found',
    'Hvidt smartwatch', null, 'Hvidt smartwatch med silikonerem. Fundet i omklædningsrummet.', 'active',
    'Fælledparken', '2100', 'København Ø', 'København', 'Region Hovedstaden', 55.7000, 12.5680,
    now() - interval '5 days', now() - interval '4 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002',
    (select id from public.categories where name = 'Tøj'), 'found',
    'Solbriller', 'Ray-Ban', 'Sorte solbriller i brunt etui. Fundet på stranden.', 'active',
    'Amager Strand', '2300', 'København S', 'København', 'Region Hovedstaden', 55.6560, 12.6500,
    now() - interval '6 days', now() - interval '5 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
    (select id from public.categories where name = 'Dokumenter'), 'lost',
    'Pas i blåt omslag', null, 'Dansk pas i blåt læderomslag. Er fundet igen.', 'resolved',
    'Københavns Lufthavn', '2770', 'Kastrup', 'Tårnby', 'Region Hovedstaden', 55.6180, 12.6560,
    now() - interval '1 day', now() - interval '1 minute'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Billeder (kufferten, nøglerne og rygsækken har ingen, så pladsholderen kan testes)
-- ---------------------------------------------------------------------------

insert into public.item_images (id, item_id, file_path, file_name)
values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=80', 'ring.jpg'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200&q=80', 'jbl.jpg'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
   'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80', 'iphone.jpg'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000007',
   'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80', 'ur.jpg'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000008',
   'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1200&q=80', 'solbriller.jpg')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Ekstra genstande til test af paginering og filtre (50 stk.)
-- Oprettet 7–90 dage tilbage, så forsidens "seneste 6" stadig er genstandene ovenfor.
-- Hver 12. er løst og hver 17. arkiveret — de må ikke blive vist.
-- ---------------------------------------------------------------------------

with catalog (idx, title, category, brand, description, image) as (
  values
    (0,  'Sorte AirPods', 'Elektronik', 'Apple', 'Sorte in-ear høretelefoner i hvidt etui.', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200&q=80'),
    (1,  'Mobiltelefon med revnet skærm', 'Elektronik', null, 'Telefon uden cover, lille revne i øverste hjørne.', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80'),
    (2,  'Kindle e-bogslæser', 'Elektronik', 'Amazon', 'Kindle i mørkeblåt cover med navn på indersiden.', null),
    (3,  'Powerbank', 'Elektronik', 'Anker', 'Hvid powerbank med kort USB-C kabel.', null),
    (4,  'Bærbar computer i sort sleeve', 'Elektronik', 'Lenovo', 'ThinkPad i sort neopren-sleeve med klistermærker.', null),
    (5,  'Bilnøgle til Toyota', 'Nøgler', 'Toyota', 'Bilnøgle med fjernbetjening og lille lygte.', null),
    (6,  'Nøglebundt med blå ring', 'Nøgler', null, 'Fire nøgler på blå plastikring.', null),
    (7,  'Cykelnøgle', 'Nøgler', null, 'Enkelt cykelnøgle med gul gummikappe.', null),
    (8,  'Sort fleece jakke', 'Tøj', null, 'Fuldærmet sort fleece, str. M.', null),
    (9,  'Grå vinterfrakke', 'Tøj', null, 'Lang grå uldfrakke med sorte knapper.', null),
    (10, 'Blå og hvid FCK trøje', 'Tøj', 'Adidas', 'Hjemmebanetrøje, str. L, navn på ryggen.', null),
    (11, 'Rødt halstørklæde', 'Tøj', null, 'Strikket rødt halstørklæde med frynser.', null),
    (12, 'Hue med pompon', 'Tøj', null, 'Grøn strikhue med hvid pompon.', null),
    (13, 'Brun lædertaske', 'Tasker', null, 'Brun skuldertaske i læder med messingspænde.', null),
    (14, 'Sort rygsæk', 'Tasker', 'Eastpak', 'Sort rygsæk med skolebøger og penalhus.', null),
    (15, 'Gymnastikpose', 'Tasker', 'Nike', 'Sort gymnastikpose med træningstøj.', null),
    (16, 'Kørekort', 'Dokumenter', null, 'Dansk kørekort i plastiklomme.', null),
    (17, 'Pung med sundhedskort', 'Dokumenter', null, 'Sort pung med sundhedskort og kvitteringer.', null),
    (18, 'Mappe med papirer', 'Dokumenter', null, 'Grøn plastikmappe med noder og papirer.', null),
    (19, 'Sølvarmbånd', 'Smykker', 'Pandora', 'Sølvarmbånd med tre charms.', null),
    (20, 'Guldring med sten', 'Smykker', null, 'Tynd guldring med lille blå sten.', null),
    (21, 'Perlehalskæde', 'Smykker', null, 'Halskæde med hvide perler og sølvlås.', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200&q=80'),
    (22, 'Paraply', 'Andet', null, 'Stor sort paraply med træhåndtag.', null),
    (23, 'Barnevognsdyne', 'Andet', null, 'Lyseblå dyne med stjerner.', null),
    (24, 'Brun bamse', 'Andet', null, 'Lille brun bamse med rød sløjfe.', null),
    (25, 'Solbriller i sort etui', 'Andet', 'Ray-Ban', 'Sorte solbriller i hårdt etui.', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1200&q=80')
),
places (idx, address, postal_code, city, municipality, region, lat, lng) as (
  values
    (0,  'Nørreport Station', '1165', 'København K', 'København', 'Region Hovedstaden', 55.6833, 12.5714),
    (1,  'Frederiksberg Centret', '2000', 'Frederiksberg', 'Frederiksberg', 'Region Hovedstaden', 55.6816, 12.5320),
    (2,  'Helsingør Station', '3000', 'Helsingør', 'Helsingør', 'Region Hovedstaden', 56.0339, 12.6117),
    (3,  'Roskilde Domkirke', '4000', 'Roskilde', 'Roskilde', 'Region Sjælland', 55.6426, 12.0804),
    (4,  'Næstved Storcenter', '4700', 'Næstved', 'Næstved', 'Region Sjælland', 55.2440, 11.7780),
    (5,  'Odense Banegård', '5000', 'Odense C', 'Odense', 'Region Syddanmark', 55.4015, 10.3867),
    (6,  'Esbjerg Havn', '6700', 'Esbjerg', 'Esbjerg', 'Region Syddanmark', 55.4650, 8.4400),
    (7,  'Kolding Storcenter', '6000', 'Kolding', 'Kolding', 'Region Syddanmark', 55.4980, 9.4770),
    (8,  'Aarhus Rådhus', '8000', 'Aarhus C', 'Aarhus', 'Region Midtjylland', 56.1527, 10.2030),
    (9,  'Silkeborg Bad', '8600', 'Silkeborg', 'Silkeborg', 'Region Midtjylland', 56.1660, 9.5300),
    (10, 'Herning Kongrescenter', '7400', 'Herning', 'Herning', 'Region Midtjylland', 56.1250, 8.9600),
    (11, 'Aalborg Banegård', '9000', 'Aalborg', 'Aalborg', 'Region Nordjylland', 57.0430, 9.9170),
    (12, 'Skagen Havn', '9990', 'Skagen', 'Frederikshavn', 'Region Nordjylland', 57.7210, 10.5900),
    (13, 'Hjørring Gågade', '9800', 'Hjørring', 'Hjørring', 'Region Nordjylland', 57.4570, 9.9820)
),
generated as (
  select
    n,
    md5('hgc-seed-item-' || n)::uuid as id,
    c.*,
    p.address, p.postal_code, p.city, p.municipality, p.region, p.lat, p.lng,
    -- 7–90 dage tilbage, med varierende klokkeslæt
    now() - make_interval(days => 7 + (n * 83 / 50), hours => (n * 5) % 24) as occurred_at
  from generate_series(1, 50) as n
  join catalog c on c.idx = (n * 7) % 26
  join places p on p.idx = (n * 3) % 14
),
inserted as (
  insert into public.items (
    id, user_id, category_id, type, title, brand, description, status,
    address, postal_code, city, municipality, region, latitude, longitude,
    occurred_at, created_at
  )
  select
    g.id,
    case when g.n % 2 = 0 then 'a0000000-0000-0000-0000-000000000001'::uuid
         else 'a0000000-0000-0000-0000-000000000002'::uuid end,
    (select id from public.categories where name = g.category),
    case when g.n % 3 = 0 then 'found'::public.item_type else 'lost'::public.item_type end,
    g.title, g.brand, g.description,
    case when g.n % 12 = 0 then 'resolved'::public.item_status
         when g.n % 17 = 0 then 'archived'::public.item_status
         else 'active'::public.item_status end,
    g.address, g.postal_code, g.city, g.municipality, g.region, g.lat, g.lng,
    g.occurred_at,
    g.occurred_at + interval '3 hours'
  from generated g
  on conflict (id) do nothing
  returning id
)
insert into public.item_images (id, item_id, file_path, file_name)
select md5('hgc-seed-image-' || g.n)::uuid, g.id, g.image, 'test.jpg'
from generated g
where g.image is not null
  and g.id in (select id from inserted)
on conflict (id) do nothing;
