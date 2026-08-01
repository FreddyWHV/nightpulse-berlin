# Prompt für den App Builder

Alles zwischen den beiden Linien 1:1 kopieren.

---

Baue eine mobile-first Web-App: **ein personalisierter Ausgeh-Feed für Berlin**.
Sie zeigt Partys, Konzerte und Clubnächte aus einer bestehenden Supabase-Datenbank
und sortiert sie nach dem, worauf die Person Lust hat.

Stack: React + TypeScript + Tailwind + `@supabase/supabase-js`. Mobile-first,
Zielgerät ist ein Smartphone im Hochformat. Kein Backend schreiben — die Daten
existieren bereits.

## 1. Datenanbindung — verbindlich

Supabase ist bereits verbunden. Es gibt genau **drei** Zugriffspunkte. Die
Basistabellen `sources` und `events` sind per Row Level Security gesperrt; ein
`from('events')` liefert mit dem anon-Key stumm ein leeres Array. Lege **keine**
Tabellen an, schreibe **nichts** nach Supabase, erstelle keine Migrations.

**View `app_events`** — der Feed, enthält nur aktive, kommende Events:

| Spalte                   | Typ                   | Hinweis                                   |
| ------------------------ | --------------------- | ----------------------------------------- |
| `id`                     | uuid                  |                                           |
| `canonical_id`           | uuid \| null          | falls gesetzt: in Listen danach dedupen   |
| `title`                  | string                | immer vorhanden                           |
| `description`            | string \| null        | **anfangs immer null**                    |
| `starts_at`              | ISO timestamp         | immer vorhanden, Europe/Berlin            |
| `ends_at`, `doors_at`    | ISO timestamp \| null |                                           |
| `venue_name`             | string                |                                           |
| `address`                | string \| null        |                                           |
| `lat`, `lng`             | number \| null        |                                           |
| `district`               | string \| null        | Kiez, z. B. „Kreuzberg"                   |
| `price_min`, `price_max` | number \| null        | **null = unbekannt, NICHT kostenlos**     |
| `is_free`                | boolean \| null       | nur das bedeutet kostenlos                |
| `ticket_url`             | string \| null        |                                           |
| `source_url`             | string                | immer vorhanden                           |
| `source_name`            | string                |                                           |
| `source_type`            | string                | `venue` \| `club` \| `api` \| `open_data` |
| `category`               | string[]              | kann leer sein                            |
| `vibe_tags`              | string[]              | **anfangs immer leer**                    |
| `lineup`                 | string[]              | kann leer sein                            |
| `image_url`              | string \| null        | **anfangs immer null**                    |

**View `app_venues`**: `id, key, name, homepage, type, district, lat, lng, address, upcoming_events`

**RPC `events_near`**:

```ts
supabase.rpc('events_near', {
  in_lat: 52.52,
  in_lng: 13.405,
  radius_m: 3000,
  from_ts: new Date().toISOString(),
  to_ts: new Date(Date.now() + 7 * 864e5).toISOString(),
  max_price: 15, // optional, null = egal
  result_limit: 100,
});
```

Rückgabe: dieselben Spalten wie `app_events`.

### Die drei Regeln, an denen die App sonst scheitert

1. **`description`, `image_url` und `vibe_tags` sind zu Beginn leer.** Baue das UI
   so, dass es damit _gut aussieht_ — nicht als Fehlerfall. Keine Skeleton-Loader
   für dauerhaft leere Felder, keine „Keine Beschreibung verfügbar"-Texte, keine
   grauen Bild-Platzhalter. Stattdessen: Typografie, Uhrzeit, Venue, Kiez und Preis
   tragen die Card. Statt eines Bildes ein deterministischer Farbverlauf, aus
   `event.id` abgeleitet, damit dieselbe Card immer dieselbe Farbe hat.
2. **`source_url` muss in der Detailansicht sichtbar verlinkt sein**, als
   „Quelle: {source_name}". Das ist rechtlich erforderlich, nicht optional. Wenn
   `ticket_url` gesetzt ist, zusätzlich als primärer Button „Tickets".
3. **Preis:** `is_free === true` → „Kostenlos". `price_min === null` → „Preis k. A."
   (nicht „0 €", nicht ausblenden). Sonst „ab {price_min} €".

## 2. Screens

Genau diese fünf, nichts weiter. Keine Suche, keine Filterleiste, keine Karte,
kein Profil, kein Login, kein Social.

### `/onboarding` — 60 Sekunden, das ist das Produkt

Drei Schritte, Fortschrittsanzeige oben, jederzeit überspringbar.

1. **Vibe-Deck**: 10 Karten, die nach links/rechts geswiped werden (Drag mit
   Maus und Touch, plus zwei Buttons als Fallback). Jede Karte ist ein Gefühl,
   kein Genre — großer Text auf farbigem Verlauf:
   „verschwitzter Warehouse-Techno" · „Jazzkeller bei Kerzenlicht" ·
   „Flohmarkt und Kaffee am Sonntag" · „queere Performance" ·
   „lauter Punk im Keller" · „Galerieeröffnung mit Gratiswein" ·
   „Open Air bis Sonnenaufgang" · „Karaoke, schlecht und glücklich" ·
   „Konzert, sitzend, gute Akustik" · „Bar mit Leuten zum Reden"
   Jede Karte trägt intern eine Liste von Tags, z. B.
   `{ id: 'warehouse', label: '…', tags: ['techno','rave','high-energy'] }`.
2. **Zwei Slider**: chillig ↔ intensiv, günstig ↔ egal.
3. **Kiez-Auswahl**: Multi-Select-Chips mit Neukölln, Kreuzberg, Friedrichshain,
   Mitte, Prenzlauer Berg, Wedding, Schöneberg, Charlottenburg, Lichtenberg,
   Treptow. Plus „überall".

Alles landet in `localStorage` unter `berlin-prefs`. Kein Supabase-Schreibzugriff.
Wer die Prefs schon hat, wird direkt auf `/feed` geleitet.

### `/feed` — „Für dich"

Events der nächsten 7 Tage, sortiert nach einem Score (siehe 3.), gruppiert nach
Tag mit klebrigen Datums-Headern („Heute", „Morgen", „Sa, 9. Aug"). Endless Scroll
oder ein „Mehr laden"-Button.

### `/tonight` — „Heute Abend"

Nur was in den nächsten 8 Stunden startet, rein chronologisch, mit einem großen
Countdown-artigen Zeitstempel pro Eintrag („in 2 Std", „ab 23:00"). Wenn leer:
freundlicher Hinweis plus Button auf den Feed.

### `/saved`

Gespeicherte Events. Speicherung **lokal** in `localStorage` als Array von
`app_events.id` — es gibt dafür bewusst keine Tabelle. Vergangene gespeicherte
Events ausgrauen statt löschen.

### `/event/:id`

Titel, Datum und Uhrzeit ausgeschrieben, Venue mit Kiez und Adresse, Preis,
Lineup als Chips, Kategorien als Chips. Dann: „Tickets"-Button falls
`ticket_url`, darunter der Quellen-Rücklink. Speichern-Button (Herz) oben rechts.
`description` nur rendern, wenn sie nicht leer ist.

Navigation: Bottom-Tab-Bar mit Feed · Heute Abend · Gespeichert.

## 3. Ranking — clientseitig, in einer eigenen Datei

Schreibe die Sortierung in eine einzelne, klar benannte Funktion, z. B.
`src/lib/ranking.ts`, mit dieser Signatur:

```ts
export function scoreEvent(event: AppEvent, prefs: Prefs, now: Date): number;
```

Gewichte:

- **Vibe-Match** (0.45): Überschneidung von `event.vibe_tags` mit den Tags der
  rechts-geswipten Karten. **`vibe_tags` ist anfangs leer** — dann fällt dieser
  Teil auf `event.category` und Stichwörter im `title` zurück. Schreibe das als
  bewussten Fallback mit Kommentar, nicht als Bug.
- **Zeit-Fit** (0.2): näher = besser, heute und morgen bevorzugt.
- **Kiez** (0.2): `district` in der Auswahl.
- **Preis** (0.15): passend zum Preis-Slider; `is_free` bekommt einen Bonus,
  `price_min === null` wird neutral behandelt, nicht bestraft.
- Danach: keine drei Events derselben Venue direkt hintereinander.

Die Funktion muss ohne Umbau funktionieren, sobald `vibe_tags` befüllt sind.

## 4. Gestaltung

Berliner Nachtleben, nicht Corporate-Event-Portal. Dunkler Hintergrund, sehr
hoher Kontrast, große kräftige Typografie als Hauptgestaltungsmittel — die App
hat **keine Fotos**, das muss eine bewusste Designentscheidung sein und darf
nicht nach fehlendem Content aussehen. Ein einzelner kräftiger Akzentton.
Großzügige Abstände, klare Hierarchie: Uhrzeit und Titel dominieren, Venue und
Kiez sekundär, Preis als kleines Label. Sparsame, schnelle Animationen
(Karten-Swipe, Herz beim Speichern). Alles auf Deutsch.

## 5. Nicht bauen

Login/Auth, Suche, Filter-UI, Karte, Push, Teilen, Kommentare, Admin,
Dark-/Light-Toggle (es ist immer dunkel), eigene Supabase-Tabellen, Schreibzugriffe.

## 6. Robustheit

- Kommt die Query leer zurück, zeige einen echten Leerzustand mit Erklärung, nicht
  einen Dauer-Spinner.
- Query-Fehler sichtbar machen (kleiner Hinweis mit Retry), nicht verschlucken.
- Alle Nullable-Felder wirklich als optional behandeln — `lat`/`lng`, `address`,
  `district`, `ticket_url` und `ends_at` fehlen bei echten Daten regelmäßig.
- Datumsformatierung in Europe/Berlin.

---
