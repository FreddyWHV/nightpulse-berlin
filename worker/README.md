# Worker — Datenbeschaffung (Bars & Clubs Berlin)

Phase 1 des Projekts: **wie kommen wir legal an Event-Daten**. Noch keine App,
noch kein Supabase — alles läuft lokal gegen JSON-Dateien in `data/`.

## Der Ansatz in vier Schritten

```
1. DISCOVER   OpenStreetMap/Overpass  ->  Berliner Bars, Pubs, Clubs, Music Venues
                                          mit *eigener* Website          (data/candidates.json)
2. GATE       Blocklist (§ 87b UrhG)  ->  robots.txt für genau diesen Pfad
3. PROBE      Publiziert die Venue ihr Programm für Maschinen?
              wp_rest > jsonld > ics > rss
4. REGISTRY   Ein Row pro Venue mit clearance green | review_pending | blocked
                                                            (data/sources.json)
```

Der entscheidende Punkt: **wir suchen nicht nach Events, wir suchen nach Quellen.**
Kein Aggregator wird angefasst. Die Kandidatenliste kommt aus OSM (ODbL), die Events
kommen später ausschließlich von den Venues selbst — aus Feeds, die sie bewusst für
Maschinen veröffentlicht haben.

## Compliance-Gate (`berlinbot/policy.py`)

Zwei getrennte Gates, beide Pflicht:

1. **Domain-Blocklist** — aus `docs/sources-allowlist.json`, zusätzlich hart im Code
   (`HARD_BLOCK_SUFFIXES`). Deckt das eigentliche Risiko ab: das sui-generis
   Datenbankrecht nach § 87b UrhG. Gilt unabhängig von robots.txt.
2. **robots.txt** — pro konkretem Pfad, für unseren User-Agent, mit `Crawl-delay`.
   Failure-Policy: 4xx (keine robots.txt) = erlaubt. 5xx oder Netzwerkfehler =
   _unbekannt_, und unbekannt behandeln wir als verboten.

Beide Gates sitzen in `fetcher.PoliteFetcher`. Es gibt **keinen Bypass-Flag** und es
wird auch keiner eingebaut — auch nicht kurz für die Demo.

```bash
python -m berlinbot.cli guard-test    # beweist, dass RA/Dice/Luma/rausgegangen/IG abprallen
```

Zusätzlich beim Ingest: `policy.assert_ingestable(row)` verlangt
`clearance == "green"` **und** `robots_status == "allowed"`. `registry.green()` ist
der einzige Weg, an eine Quellenliste zu kommen.

Braver Bot: `User-Agent: BerlinEventsBot/0.1 (+…)`, Concurrency **1 pro Host**
(per-Host-Lock), Crawl-Delay respektiert, conditional GET mit ETag/Last-Modified,
Response-Cache in `data/cache/`.

## Clearance-Regeln

| Befund                          | clearance        | Konsequenz                                       |
| ------------------------------- | ---------------- | ------------------------------------------------ |
| Domain auf Blocklist            | `blocked`        | nie ingesten, nur verlinken                      |
| robots.txt verbietet uns        | `blocked`        | —                                                |
| maschinenlesbarer Feed gefunden | `green`          | läuft                                            |
| kein Feed, robots ok            | `review_pending` | html_llm-Kandidat, braucht **manuelle** Freigabe |

`review_pending` wird bewusst **nie** automatisch grün. Der generische HTML→LLM-
Extractor (Tier 3 im Gameplan) läuft nur gegen Quellen, die ein Mensch freigegeben hat.

## Commands

```bash
python -m berlinbot.cli discover                    # OSM-Kandidaten holen
python -m berlinbot.cli probe --kind nightclub      # Feeds suchen (--limit N zum Testen)
python -m berlinbot.cli report                      # Stand der Registry
python -m berlinbot.cli guard-test                  # Compliance-Gate beweisen
```

Setup:

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

Env-Overrides: `BERLINBOT_UA`, `BERLINBOT_CRAWL_DELAY` (default 5s),
`BERLINBOT_HOST_PARALLELISM` (default 8), `BERLINBOT_OVERPASS`.

## Was noch fehlt (Phase 2)

- Adapter, die aus den grünen Quellen tatsächlich Events ziehen: `wp_rest`, `jsonld`,
  `ics`, `rss` — vier kleine Parser, alle liefern in dasselbe `raw_events`-Format.
- kulturdaten.berlin + Ticketmaster als Base Layer (brauchen API-Keys).
- Normalizer → Dedup → Enricher, wie in `docs/gameplan.md`.
- **Nur Fakten** übernehmen (Datum, Zeit, Venue, Preis, Lineup). Beschreibungen und
  Fotos Dritter werden nicht gespeichert — Copy schreiben wir selbst.
