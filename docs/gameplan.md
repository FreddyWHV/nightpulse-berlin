# Berlin Event Aggregator — Gameplan (v2, green-sources-only)

**Scope:** hackathon demo (native mobile app). **Data policy: GREEN sources only.** Everything amber/red has been removed from the build and is listed at the bottom as an explicit do-not-use blocklist.

---

## 0. Data strategy in one line

Do **not** scrape aggregators. Build on (a) official open APIs, (b) machine-readable feeds that venues publish _for_ machine consumption, (c) your own supply side. That's enough for a demo and it's the only version that survives contact with a lawyer.

| Tier | Method                                                         | Effort  | Risk | Berlin coverage            |
| ---- | -------------------------------------------------------------- | ------- | ---- | -------------------------- |
| 1    | Official APIs / open data                                      | Low     | None | mainstream + culture       |
| 2    | Venue-published feeds: ICS, RSS, JSON-LD, WP REST, sitemaps    | Low–Med | None | ~40% of independent venues |
| 3    | Generic HTML→LLM extraction, **only on sources cleared green** | Med     | Low  | the long tail              |
| 4    | Venue self-serve + user submissions                            | Med     | None | the exclusive stuff        |

---

## 1. Source registry — the table that enforces the policy

```
sources
  id, name, homepage, type            -- venue | club | api | open_data
  city, district, geo
  ingest_method                       -- api | ics | rss | jsonld | wp_rest | html_llm | manual
  endpoint_url
  robots_status                       -- allowed | disallowed | partial   (auto-checked)
  robots_checked_at
  clearance                           -- green | blocked        (only green is runnable)
  clearance_note, tos_url
  crawl_delay_s, last_crawl_at, next_crawl_at
  parser_key, parser_config (jsonb)
  health                              -- ok | degraded | broken
  events_last_run, error_last_run
```

**Hard guard in code:** the fetcher refuses any source where `clearance != 'green'` or `robots_status != 'allowed'`. 20 minutes to write, and it's your entire compliance answer.

---

## 2. ✅ GREEN — the only sources you build on

### 2.1 kulturdaten.berlin — your base layer

- `https://api-v2.kulturdaten.berlin/api/` · docs: `https://api-v2.kulturdaten.berlin/api/docs/`
- Berlin's official cultural data hub (Technologiestiftung Berlin, Senate-funded). Free account for API access.
- **Code MIT, data CC BY** — explicitly built for third parties to build apps on.
- Gives you events, locations, organizations. Start here, hour one.

### 2.2 Ticketmaster International Discovery API v2

- `https://developer.ticketmaster.com/products-and-docs/apis/international-discovery/v2/`
- Free API key, covers Germany. Big venues, concerts, comedy, sport. Filter `city=Berlin`.
- Clean commercial terms, includes ticket links (→ affiliate revenue later).

### 2.3 Berlin Open Data

- `https://daten.berlin.de/` — city/administrative events, markets, public culture. Open licenses.

### 2.4 visitBerlin event calendar

- Official tourism board calendar. Check their data/partner terms — they actively _want_ redistribution, so it's a green candidate after a 5-minute read.

### 2.5 Venue-published machine-readable feeds ← **the real coverage win**

If a venue ships any of these, they published it _for_ machines. Zero risk:

- `<script type="application/ld+json">` with `@type: Event` — extremely common on WordPress/Squarespace venue sites
- `.ics` calendar exports
- RSS/Atom event feeds
- WordPress REST: `/wp-json/wp/v2/...` or `/wp-json/tribe/events/v1/events` (The Events Calendar plugin — very widespread among Berlin venues)

**Action:** spend 30 minutes with a list of 30 Berlin venues you like, and for each check `/wp-json/tribe/events/v1/events`, then the page source for `ld+json`, then `/events.ics`. Every hit is a free, permanent, legally clean source. Expect a hit rate around 30–50%.

### 2.6 Your own supply

- Venue self-serve form (one row in `sources`, `ingest_method = manual`).
- User submissions with light moderation.
- For the demo: 5–10 hand-curated "insider" events make the feed feel Berlin-real.

---

## 3. 🚫 BLOCKED — do not use, do not scrape, do not demo

These were considered and **rejected**. Keep them in the registry with `clearance = 'blocked'` so nobody on the team re-adds them by accident.

| Source                                     | Why blocked                                                                                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ra.co (Resident Advisor)**               | robots blocks `/api/`, blocks commercial crawlers and every AI agent by name; ToS forbids scraping. Their GraphQL is the tempting one and it's exactly what they've closed. **Link out only — never ingest.**                             |
| **rausgegangen.de**                        | robots technically permits it, but they're a direct competitor/aggregator and their DB enjoys **§ 87b UrhG** sui-generis protection. Extracting substantial parts is the classic database-right violation. **Partnership, not scraping.** |
| **luma.com / lu.ma**                       | Official API only reads calendars _you own_ (Luma Plus required). Everything else is page-scraping a platform's aggregated DB → same § 87b problem. **Blocked; revisit via official partnership.**                                        |
| **dice.fm**                                | `Disallow: /api/` for all agents, `Content-Signal: ai-train=no`, all AI crawlers blocked. **Blocked; approach via their partner/affiliate programme.**                                                                                    |
| **eventim.de**                             | Aggregated commercial DB, no open API. Affiliate programme exists — that's the route.                                                                                                                                                     |
| **Instagram / Facebook events**            | ToS explicitly forbids automated collection. **Never.**                                                                                                                                                                                   |
| Anything behind login, paywall, or captcha | —                                                                                                                                                                                                                                         |

**Legal frame, four lines:**

- § 87b UrhG / EU Database Directive: extracting substantial parts of someone's event DB is the real risk, _independent of robots.txt_.
- § 44b UrhG (TDM): the exception exists, but a machine-readable opt-out is a valid reservation of rights.
- Facts (date, time, venue, price, lineup) aren't copyrightable. **Descriptions and photos are** — write your own copy.
- robots.txt and ToS are two separate gates. Passing one ≠ permission.

---

## 4. Ingestion pipeline

```
sources (green only) ──▶ Scheduler ──▶ Fetcher + guard
                                          │
        ┌──────────┬──────────┬───────────┼───────────┐
     API adapter  ICS/RSS   JSON-LD    WP REST    HTML→LLM
        └──────────┴──────────┴───────────┴───────────┘
                        │ raw_events (jsonb)
                   Normalizer   → canonical schema, geocode, tz, price parse
                   Dedup        → title + start ±90min + venue geo
                   Enricher     → vibe tags + embedding (pgvector)
                        │
                     events ──▶ API ──▶ app
```

**One generic extractor, not N parsers.** Fetch → strip to main content (trafilatura) → one LLM call with a strict JSON schema → validate with Pydantic → drop anything without a parseable start time. Adding a venue = inserting one row. That's your demo money-shot: _"we onboard a new venue in 30 seconds."_

**Canonical schema**

```
events
  id, source_id, source_event_id, source_url, canonical_id
  title, description_ours          -- our copy, never their text verbatim
  starts_at (timestamptz), ends_at, doors_at
  venue_id, address, lat, lng
  price_min, price_max, is_free, ticket_url
  category[]                       -- club, concert, art, theatre, talk, market, community
  vibe_tags[]                      -- techno, cozy, queer, outdoor, high-energy, date-night...
  lineup[], image_url, image_source
  embedding vector(1536)
  first_seen_at, last_seen_at, status
```

**Dedup:** block on `date + rounded_geo`, then score — title similarity 0.5, start ±90 min 0.3, venue geo <200 m 0.2. Above 0.75 → same `canonical_id`. Merge with source priority: venue's own site > kulturdaten > Ticketmaster.

**Be a good bot:** `User-Agent: BerlinEventsBot/0.1 (+https://yourapp.de/bot; you@mail)`, concurrency 1 per host, conditional GET with ETag, respect `Crawl-delay`, 6–12 h cadence with jitter.

---

## 5. Native app — stack recommendation

### The call: **Expo (React Native) + Supabase + a Python worker**

For a hackathon demo this is not close. Reasons:

- **Expo Go / dev client** = the app runs on a judge's actual phone in 10 seconds via QR code. No Xcode, no provisioning profiles, no TestFlight review. This alone is worth the choice.
- One codebase → iOS + Android + a web build you can fall back on if a phone dies on stage.
- Supabase gives you Postgres + **pgvector** + **PostGIS** + Auth + storage + an auto-generated REST/realtime API. Your recommendation engine is a SQL query, not a service.
- Python worker stays _separate_ from the app — the scraping/LLM ecosystem there (httpx, trafilatura, feedparser, ics, Playwright, Pydantic) is far ahead of JS.

### Concrete stack

| Layer           | Pick                                                                    | Why                                                              |
| --------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| App             | **Expo SDK 5x, expo-router**                                            | file-based routing, OTA updates mid-hackathon                    |
| UI              | **NativeWind** (Tailwind for RN) + **Expo Symbols/lucide-react-native** | fastest path to something that doesn't look like a hackathon app |
| Animation       | **react-native-reanimated** + **react-native-gesture-handler**          | the swipe deck; both ship with Expo                              |
| Swipe deck      | roll your own with Reanimated (~80 lines)                               | libs are mostly abandoned; Reanimated is 30 min of work          |
| Lists           | **@shopify/flash-list**                                                 | smooth 60fps feed, drop-in                                       |
| State/data      | **@tanstack/react-query** + Supabase JS client                          | caching + optimistic saves for free                              |
| Maps (optional) | `react-native-maps`                                                     | only if you have spare time                                      |
| Backend         | **Supabase** (Postgres 15 + pgvector + PostGIS)                         |                                                                  |
| API             | Supabase auto REST + 1–2 **Edge Functions** for the ranking query       |                                                                  |
| Auth            | **anonymous sign-in** for the demo                                      | zero-friction onboarding; no email flow on stage                 |
| Worker          | **Python 3.12** on Railway or Fly, cron every 6h                        |                                                                  |
| LLM             | Claude with structured JSON output (extraction + "why this is for you") |                                                                  |
| Embeddings      | any 1536-dim embedding model → pgvector                                 |                                                                  |

### App structure

```
app/
  _layout.tsx
  onboarding/
    index.tsx          → welcome
    vibes.tsx          → swipe deck of 10 vibe cards  ← the personality
    sliders.tsx        → chill↔intense, solo↔social, cheap↔splurge
    area.tsx           → Kieze + typical nights out
  (tabs)/
    feed.tsx           → ranked "For You" list
    tonight.tsx        → time-boxed: what's on in the next 6h
    saved.tsx
  event/[id].tsx       → detail + ticket link out
```

**Build only these four screens.** Skip search, filters, map, profile editing, social features. A hackathon demo is won by depth on one flow, not breadth.

### The vibe onboarding (60 seconds, this is the product)

- 10 swipeable cards with real event photos: _"sweaty warehouse techno"_, _"candlelit jazz cellar"_, _"sunday flea market + coffee"_, _"queer performance art"_, _"loud punk basement"_, _"gallery opening with free wine"_.
- Each card has a fixed embedded text description. **User vector = mean of embeddings of the cards they swiped right.**
- Same pgvector space as events → recommendations are one SQL query on day one, no training data, no cold-start problem.

### Ranking (one SQL query + one LLM call)

```
score = 0.55 · cosine(user_vec, event_vec)
      + 0.15 · time-fit (within their chosen window)
      + 0.15 · geo proximity
      + 0.10 · price fit
      + 0.05 · diversity penalty (no 8 techno nights in a row)
```

Re-rank the top ~40 with **one** LLM call that writes a _"why this is for you"_ one-liner per card. That line is what makes the demo feel magic — and since it's your own copy, you're not republishing anyone's description.

**Feedback loop:** save → `u ← 0.9u + 0.1e`; hide → subtract. Two lines of code, and it visibly learns during the demo.

### Demo-safety rules (learned the hard way)

1. **Seed the DB from a snapshot.** Never scrape live on stage.
2. Build a **web version too** (`expo start --web`) as the fallback if the phone mirroring fails.
3. Pre-warm every LLM call you'll make, or cache the results into the DB before the demo.
4. Screen-record a 60-second happy path as the ultimate fallback.
5. Airplane-mode test: does the feed render from cache?

---

## 6. Hour-by-hour

| Hours | Do                                                                                                         | Don't                     |
| ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------- |
| 0–1   | Supabase schema + seed `sources` with kulturdaten, Ticketmaster, and 20 venue feeds you verified by hand   | build auth flows          |
| 1–3   | Two adapters: **kulturdaten API** + **generic HTML→LLM**. Get real events into the DB before anything else | perfect the parser        |
| 3–4   | Normalizer + dedup + geocode                                                                               | over-engineer merge rules |
| 4–5   | Enricher: vibe tags + embeddings for every event                                                           | —                         |
| 5–7   | Expo: onboarding vibe deck → feed → detail → save                                                          | search / filters / map    |
| 7–8   | Ranking query + LLM "why this is for you"                                                                  | —                         |
| 8–9   | JSON-LD / ICS / WP-REST adapter + 10 more venue sources                                                    | —                         |
| 9–10  | **Demo script + source-registry slide + seed snapshot**                                                    | demo live scraping        |

**Cut list if behind:** ICS adapter, feedback loop, map, auth (device-local profile instead).

---

## 7. The judge question: "isn't this illegal?"

> "We deliberately don't scrape aggregators. Every source is a row in a registry with an automated robots.txt check and a manual clearance flag, and the fetcher physically refuses to run against anything not cleared green. Our base layer is Berlin's own open cultural data under CC BY, plus feeds venues publish specifically for machines. RA, Dice, Luma and rausgegangen are on an explicit blocklist — we link out to them, we never ingest them, because their databases are protected under § 87b UrhG. We ingest facts, we write our own copy, and onboarding a venue is one database row. Partnership scales better than scraping."

---

## 8. After the hackathon

1. **Venue self-serve portal** — free, one form, instantly in the app. Flips scraping into supply.
2. **Partnerships** with Dice / Eventim / rausgegangen via their affiliate programmes — ticket affiliate revenue is also your business model, which makes the conversation easy.
3. **Instagram-first venues** — a huge slice of Berlin nightlife has no website. Opt-in "connect your venue's IG", never scraping.
4. **User submissions** — the word-of-mouth layer no aggregator has. That's the only durable moat here.

---

**Sources:**
[kulturdaten.berlin API repo](https://github.com/technologiestiftung/kulturdaten-api) ·
[kulturBdigital](https://www.kultur-b-digital.de/en/berlins-cultural-data/) ·
[Ticketmaster International Discovery API](https://developer.ticketmaster.com/products-and-docs/apis/international-discovery/v2/) ·
[Berlin Open Data](https://daten.berlin.de/) ·
[ra.co/robots.txt](https://ra.co/robots.txt) ·
[dice.fm/robots.txt](https://dice.fm/robots.txt) ·
[rausgegangen.de/robots.txt](https://rausgegangen.de/robots.txt) ·
[luma.com/robots.txt](https://luma.com/robots.txt) ·
[Luma API docs](https://help.luma.com/p/luma-api)
