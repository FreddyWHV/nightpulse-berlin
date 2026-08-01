# Berlin Event Aggregator — Backend

Ein Ausgeh-Feed für Berlin, der Events aus vielen Quellen zusammenführt — gebaut mit
der Einschränkung, **keinen einzigen Aggregator zu scrapen.**

Hackathon-Projekt, 1. August 2026. Dieses Repo enthält das **Backend**: die
Datenbeschaffung, das Compliance-Gate, das Supabase-Schema und den Zugriffs-Contract
für die App.

---

## Ergebnis

|                                     |                        |
| ----------------------------------- | ---------------------- |
| Events in der Datenbank             | **910**                |
| Grün freigegebene Quellen           | **49**                 |
| Registry gesamt (inkl. Audit-Trail) | **244**                |
| Geprüfte Berliner Venues            | 244 von 690 Kandidaten |

Grüne Quellen nach Ingest-Methode: 21 × `html_llm`, 10 × `rss`, 10 × `jsonld`,
5 × `ics`, 3 × `wp_rest`.

Drin sind unter anderem Berghain (63 Events), Ritter Butzke, Matrix, Kater Blau,
Tresor, Zur Wilden Renate, Maxxim, SO36, Lido, Astra, Huxleys, Privatclub, A-Trane
und Badehaus.

---

## Der eigentliche Punkt: wie man das legal macht

Berliner Eventdaten liegen bei Resident Advisor, rausgegangen und Dice. Die zu
scrapen ist der offensichtliche Weg — und der falsche. Nicht wegen robots.txt,
sondern wegen **§ 87b UrhG**: das Datenbankherstellerrecht schützt deren
Event-Datenbanken unabhängig davon, was in der robots.txt steht.

Der Ansatz hier dreht das um: **wir suchen keine Events, wir suchen Quellen.**

```
1. DISCOVER   OpenStreetMap/Overpass  →  690 Berliner Bars/Clubs mit eigener Website
2. GATE       Blocklist (§ 87b)       →  robots.txt für genau diesen Pfad
3. PROBE      Publiziert die Venue ihr Programm für Maschinen?
                                          wp_rest > jsonld > ics > rss
4. CLEAR      Kein Feed? → review_pending. Freigabe ist eine Menschenentscheidung.
5. EXTRACT    Feed-Adapter, oder ein generischer HTML→LLM-Extractor
6. NORMALIZE  Fakten säubern, Vergangenes und kaputte Daten verwerfen
7. PUSH       Supabase
```

Die Kandidatenliste kommt aus OSM (ODbL). Geprobed wird ausschließlich die
venue-eigene Domain. Ein Treffer heißt: diese Venue hat ihr Programm bewusst
maschinenlesbar veröffentlicht.

**Das Gate ist keine Konvention, sondern Code an zwei Stellen:**

Im Worker refused [`policy.py`](worker/berlinbot/policy.py) jeden Request gegen eine
blockierte Domain oder einen von robots.txt verbotenen Pfad. Es gibt kein
Bypass-Flag.

In der Datenbank verhindert ein Trigger, dass überhaupt ein Event an einer nicht
freigegebenen Quelle hängen kann:

```
400 — refusing event from source soundlabor (Soundlabor):
clearance=blocked, robots_status=disallowed — only green+allowed may be ingested
```

Das ist die Antwort auf „woher wisst ihr, dass niemand den Guard umgangen hat" —
es geht physisch nicht, unabhängig vom Worker-Code.

Ausführlich: [docs/data-policy.md](docs/data-policy.md)

---

## Aufbau

```
worker/                Python 3.9+, kein Framework
  berlinbot/
    policy.py            Blocklist + robots.txt — beide Gates
    fetcher.py           einziger HTTP-Weg: UA, 1 Request/Host, Crawl-Delay, ETag-Cache
    registry.py          Clearance-Regeln, sources.json
    discovery/
      overpass.py        Kandidaten aus OpenStreetMap
      probe.py           sucht wp_rest / jsonld / ics / rss
    ingest/
      adapters.py        vier Feed-Parser, Fakten only
      llm.py             generischer HTML→LLM-Extractor (Claude, striktes JSON-Schema)
      normalize.py       Entities, Vergangenes, unplausible Daten
    sink/supabase.py     Upsert über PostgREST
  data/                  Registry + Event-Snapshot (siehe LICENSE)

supabase/
  migrations/            Schema, RLS, App-Views, Compliance-Trigger
  README.md              Zugriffs-Contract für die App

docs/
  gameplan.md            der ursprüngliche Plan
  data-policy.md         die Rechtslage und wie der Code sie durchsetzt
  sources-allowlist.json maschinenlesbare Blocklist
  app-builder-prompt.md  Prompt, mit dem das Frontend gebaut wurde
```

Die App selbst liegt in einem eigenen Repo und liest ausschließlich die Views
`app_events` / `app_venues` und die RPC `events_near()`.

---

## Selbst laufen lassen

```bash
cd worker
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env      # Supabase- und Anthropic-Keys eintragen
```

```bash
.venv/bin/python -m berlinbot.cli guard-test     # beweist, dass RA/Dice/Luma abprallen
.venv/bin/python -m berlinbot.cli discover       # OSM-Kandidaten
.venv/bin/python -m berlinbot.cli probe --kind nightclub
.venv/bin/python -m berlinbot.cli clear Berghain Tresor --note "manuelle Freigabe"
.venv/bin/python -m berlinbot.cli pull
.venv/bin/python -m berlinbot.cli push
```

Vor dem ersten Lauf gegen echte Venues: `BERLINBOT_UA` in der `.env` auf eine
erreichbare Kontaktadresse setzen. Der Default ist ein Platzhalter, und ein Bot ohne
Rückkanal ist unhöflich.

Das Supabase-Schema liegt in `supabase/migrations/` und läuft per `supabase db push`
oder Copy-Paste in den SQL Editor.

---

## Was fehlt

Ehrliche Liste, nicht kaschiert:

- **Dedup ist nicht gebaut.** `canonical_id` ist überall `null`. Dasselbe Konzert aus
  zwei Quellen erscheint doppelt — im Feed sichtbar. Die Regel steht im Gameplan
  (Titelähnlichkeit + Startzeit ±90 min + Venue-Geo <200 m, Schwelle 0.75).
- **Kein Enricher.** `description`, `vibe_tags` und `embedding` sind leer, deshalb
  gibt es noch keine Vektor-Empfehlungen — die App sortiert clientseitig.
- **Fünf Clubs liefern nichts** (://about blank, Else, Humboldthain, Prince Charles,
  Sisyphos): deren Programm lädt clientseitig nach, ein HTTP-Fetcher sieht dort
  nichts. Playwright-Fallback wäre der nächste Schritt.
- **kulturdaten.berlin und Ticketmaster** sind als Quellen vorgesehen, aber nicht
  angebunden — beide brauchen nur einen kostenlosen API-Key und je einen Adapter.
- **`pull` läuft seriell.** Bei 49 Quellen dauert ein Durchlauf entsprechend; das
  Parallelisieren ist ein kleiner Fix, war aber nicht demo-kritisch.
- 140 Venues stehen auf `review_pending` und warten auf eine manuelle Freigabe.

---

## Lizenz

Code: MIT. Daten unter `worker/data/`: siehe [LICENSE](LICENSE) — `candidates.json`
stammt aus OpenStreetMap und steht unter ODbL.
