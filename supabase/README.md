# Supabase — Schema & Zugriffs-Contract für die App

Das ist der Vertrag zwischen Backend und App. Solange die App nur `app_events`,
`app_venues` und `events_near()` benutzt, kann sich am Ingest darunter alles ändern,
ohne dass in der App etwas kaputtgeht.

## Migration anwenden

Projekt anlegen auf supabase.com, dann entweder:

```bash
supabase link --project-ref <dein-ref>
supabase db push
```

oder den Inhalt von `migrations/20260801000001_init.sql` in den SQL Editor im
Dashboard einfügen und ausführen. Das Skript ist idempotent bei den Extensions,
aber nicht bei den Tabellen — auf einer frischen DB laufen lassen.

Extensions, die dabei aktiviert werden: `pgcrypto`, `postgis`, `vector`, `pg_trgm`.
Alle vier sind auf Supabase verfügbar und müssen nicht extra freigeschaltet werden.

> Hinweis: die Migration wurde bisher nicht gegen eine echte Postgres-Instanz
> ausgeführt (lokal ist kein Postgres/Docker vorhanden). Beim ersten `db push`
> also kurz auf Fehler schauen.

## Sicherheitsmodell — wichtig für die App

- Die Basistabellen `sources` und `events` haben RLS an und **keine** Policies.
  Mit dem anon-Key kommst du da nicht ran. Das ist Absicht.
- Die App liest ausschließlich die beiden Views und die eine RPC. Die laufen mit
  `security_invoker = off`, also mit den Rechten des Owners, und sind für `anon`
  freigegeben.
- Der `service_role`-Key gehört **nur** in den Worker (`worker/.env`). Niemals in
  die App, auch nicht in ein „nur für den Hackathon"-Env-File.

In der App brauchst du also nur:

```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=<anon key>
```

## `app_events` — der Feed

Nur aktive Events aus grün freigegebenen Quellen, ab „vor 4 Stunden" (damit ein
laufender Abend nicht aus dem Feed fällt).

| Spalte                            | Typ         | Hinweis                                                                   |
| --------------------------------- | ----------- | ------------------------------------------------------------------------- |
| `id`                              | uuid        |                                                                           |
| `canonical_id`                    | uuid        | gruppiert Duplikate aus mehreren Quellen; kann NULL sein bis Dedup läuft  |
| `title`                           | text        |                                                                           |
| `description`                     | text        | **unsere eigene Copy**, nicht der Text der Venue. Zu Beginn NULL          |
| `starts_at`                       | timestamptz | immer gesetzt                                                             |
| `ends_at`, `doors_at`             | timestamptz | oft NULL                                                                  |
| `venue_name`                      | text        |                                                                           |
| `address`                         | text        |                                                                           |
| `lat`, `lng`                      | float8      | können NULL sein                                                          |
| `district`                        | text        | Kiez, aus OSM                                                             |
| `price_min`, `price_max`          | numeric     | NULL = unbekannt, nicht „kostenlos"                                       |
| `is_free`                         | bool        |                                                                           |
| `ticket_url`                      | text        |                                                                           |
| `source_url`                      | text        | **immer gesetzt** — der Rücklink, muss in der Detailansicht sichtbar sein |
| `source_name`, `source_type`      | text        | `venue` \| `club` \| `api` \| `open_data`                                 |
| `category`, `vibe_tags`, `lineup` | text[]      | leeres Array wenn unbekannt                                               |
| `image_url`                       | text        | nur eigene/lizenzierte Bilder. Anfangs NULL — plane ein Fallback ein      |

Zwei Dinge, auf die du dich in der App einstellen solltest: `description` und
`image_url` sind am Anfang **leer**, weil wir fremde Texte und Fotos nicht
speichern dürfen. Beides wird vom Enricher später gefüllt. Baue die Cards so, dass
sie ohne Bild und ohne Beschreibung schon gut aussehen.

## `app_venues` — die Locations

`id, key, name, homepage, type, district, lat, lng, address, upcoming_events`

## `events_near()` — Geo + Zeit in einem Call

```
events_near(
  in_lat       float8,
  in_lng       float8,
  radius_m     float8      default 5000,
  from_ts      timestamptz default now(),
  to_ts        timestamptz default now() + interval '7 days',
  max_price    numeric     default null,
  result_limit int         default 100
) returns setof app_events
```

## Beispiele (supabase-js)

```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Feed: die nächsten 7 Tage
const { data } = await supabase
  .from('app_events')
  .select('*')
  .lte('starts_at', new Date(Date.now() + 7 * 864e5).toISOString())
  .order('starts_at', { ascending: true })
  .limit(100);

// Tonight: was geht in den nächsten 6 Stunden
const { data: tonight } = await supabase
  .from('app_events')
  .select('*')
  .lte('starts_at', new Date(Date.now() + 6 * 36e5).toISOString())
  .order('starts_at');

// In der Nähe, max 15 €
const { data: near } = await supabase.rpc('events_near', {
  in_lat: 52.5,
  in_lng: 13.42,
  radius_m: 3000,
  max_price: 15,
});

// Nach Vibe filtern (text[] contains)
const { data: techno } = await supabase
  .from('app_events')
  .select('*')
  .contains('vibe_tags', ['techno']);
```

## Was später dazukommt

- `description` + `vibe_tags` + `embedding` aus dem Enricher.
- Eine `rank_events(user_embedding, ...)` RPC für den personalisierten Feed —
  bis dahin sortiert die App selbst nach `starts_at`.
- `canonical_id` wird vom Dedup gesetzt; danach in der App nach `canonical_id`
  gruppieren, damit dasselbe Konzert aus zwei Quellen nur einmal erscheint.
