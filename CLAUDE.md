# Berlin Event Aggregator

Mobile app that aggregates Berlin events from multiple providers into one feed, with
personalized recommendations based on interests and "vibes" collected during onboarding.

Status: hackathon build (started 2026-08-01). Demo-quality is enough.

## Read first

- `docs/gameplan.md` — full plan: data strategy, architecture, stack, hour-by-hour build order
- `docs/sources-allowlist.json` — machine-readable source clearance list

## Stack

- **App:** Expo (React Native), expo-router, NativeWind, Reanimated, FlashList, React Query
- **Backend:** Supabase — Postgres + pgvector + PostGIS, anonymous auth, Edge Functions
- **Worker:** Python 3.12 (httpx, trafilatura, feedparser, ics, Pydantic, Playwright fallback)
- **LLM:** Claude with strict JSON schema output (event extraction + "why this is for you" copy)

## Non-negotiable data policy

**Only ingest sources with `clearance: "green"` in `docs/sources-allowlist.json`.**

The fetcher must refuse to run against any source where `clearance != "green"` or
`robots_status != "allowed"`. This guard is not optional and must not be bypassed,
not even temporarily for a demo.

Explicitly blocked — never scrape, never ingest, link out only:
`ra.co`, `rausgegangen.de`, `luma.com` / `lu.ma`, `dice.fm`, `eventim.de`,
Instagram, Facebook Events.

Reason: robots.txt is only one gate. German/EU **§ 87b UrhG** (sui-generis database
right) protects these aggregators' event databases independently of robots.txt.
Extracting substantial parts is the actual legal risk.

Additional rules:

- Ingest **facts only** (date, time, venue, price, lineup). Facts aren't copyrightable.
- **Never** store or display third-party descriptions or photos verbatim — generate our own copy.
- Always keep `source_url` and link back.
- Identify the crawler: `User-Agent: BerlinEventsBot/0.1 (+https://<domain>/bot; <contact>)`
- Concurrency 1 per host, respect `Crawl-delay`, conditional GET with ETag.

## Conventions

- Python worker lives in `worker/`, Expo app in `app/`, SQL migrations in `supabase/migrations/`.
- One generic HTML→LLM extractor — do **not** write a bespoke parser per venue.
  Adding a venue = inserting one row in the `sources` table.
- Dedup key: title similarity + start time ±90 min + venue geo <200 m, threshold 0.75.
- Source priority when merging: venue's own site > kulturdaten > Ticketmaster.

## Demo safety

- Seed the DB from a snapshot. Never scrape live during a demo.
- Keep the `expo start --web` build working as a fallback.
- Pre-cache all LLM output into the DB before demoing.
