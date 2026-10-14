# Import af data fra den gamle Hittegodscentralen

**Arkiv.** Importen er kørt i produktion den 14. oktober 2026, og eksporten i `data/` er slettet. Scriptene ligger her til reference, og `npm run import:*`-kommandoerne er fjernet. Skal de køres igen, kør dem direkte med `npx tsx` (se nedenfor) og en ny eksport.

Scripts, der flytter data fra den gamle Hittegodscentralen over i den nye Supabase-database.

## Mapper

| Sti | Indhold |
| --- | --- |
| `scripts/archive/legacy-import/` | Selve scriptene (TypeScript, køres med `tsx`) |
| `scripts/archive/legacy-import/data/` | Eksporten fra det gamle system. **Committes aldrig** (står i `.gitignore`), da den indeholder navne, e-mails og telefonnumre |

## Sådan kører et script

Scriptene bruger serverens kode og `.env.local`, ligesom `npm run mail:test`:

```bash
npx tsx --conditions=react-server --env-file=.env.local scripts/archive/legacy-import/<script>.ts
```

Alle scripts skal som udgangspunkt køre **uden at skrive noget** og kun vise, hvad de ville gøre. Først med `--commit` skriver de til databasen. Kør altid mod testdatabasen først.

## Scripts

| Kommando | Gør |
| --- | --- |
| `npm run import:transform` | Læser WordPress-eksporten (de tre `hg-*.json`-filer) og skriver rensede data til `data/out/`: `users.json`, `items.json` og `report.md`. Rører ikke databasen |
| `npm run import:images` | Henter billederne til opslagene fra den gamle side ned i `data/images/` (kør før domænet flyttes). Kan køres igen; hentede billeder springes over |
| `npm run import:users` | Opretter gamle brugere uden adgangskode og sender dem en mail om at vælge en ny. Læser `data/out/users.json`. Se kommentaren øverst i `users.ts` for flag |
| `npm run import:load` | Opretter kategorier og opslag fra `data/out/items.json` og uploader billederne fra `data/images/`. Kør `import:users -- --commit` først. Kan genoptages via `data/out/loaded-<projekt>.json` (én fil pr. database) |

## Den nye database

Det, de gamle data skal passe ind i. Se `supabase/migrations/` for detaljer.

| Tabel | Vigtige kolonner | Bemærk |
| --- | --- | --- |
| `auth.users` + `public.users` | e-mail, `full_name` | Oprettes via Supabase Auth (admin API), ikke direkte i tabellen |
| `categories` | `name`, `user_created` | Navne renses med `normalizeCategoryName` (`lib/category-name.ts`) |
| `items` | `type` (`lost`/`found`), `title`, `description`, `category_id`, `status`, sted (`region`, `city`, `postal_code`, `municipality`, `latitude`, `longitude`, `location_exact`), `occurred_at`, `created_at`, `expires_at` | Enten `user_id` eller `contact_email` skal være sat |
| `item_images` | `item_id`, `file_path` | Filerne ligger i Storage-bucket `item-images` under `<user_id eller guest>/<item_id>/<fil>.jpg` |
| `conversations`, `messages` | | Kun hvis gamle beskeder skal med |

## Det skal importen tage højde for

- **Ingen mails ved import.** Scripts skriver direkte i databasen og sender ikke mails. Men det daglige udløbsjob gør: gamle opslag med `expires_at` inden for 14 dage får en "udløber snart"-mail, og udløbne bliver arkiveret og får en "udløbet"-mail. Sæt derfor `expires_at` og `expiry_warned_at` bevidst for importerede opslag.
- **Kan køres igen.** Gem det gamle id på hver række (fx en `legacy_id`-kolonne), så en ny kørsel opdaterer i stedet for at lave dubletter.
- **Brugere uden konto.** Opslag fra gamle brugere, der ikke skal have en konto, importeres med `contact_email` og `user_id = null`. De kan så administreres via linket i mails.
- **Brugere med konto.** Adgangskoder kan normalt ikke flyttes. Gamle brugere skal oprettes og nulstille deres adgangskode, eller have en invitation.
- **Billeder.** Skal hentes fra det gamle system, gøres mindre og uploades til Storage.
- **Steder.** Kommune og koordinater kan slås op ud fra postnummer med `lookupPostalCode` (`lib/geo.ts`). Hold Nominatims grænse på 1 opslag i sekundet.
