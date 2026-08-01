# Handover-Paket

Alles, was ein anderes Projekt braucht, um auf dieser Arbeit aufzusetzen — ohne
Code aus diesem Repo importieren zu müssen. Reine CSV/JSON-Dateien.

Neu erzeugen mit:

```bash
python -m berlinbot.cli export
```

| Datei | Inhalt |
|---|---|
| `venues-with-feeds.csv` / `.json` | **49 Berliner Venues**, deren Programm automatisiert auslesbar ist. Mit Ingest-Methode, Endpunkt, Geo, Kiez, OSM-ID. |
| `venues-review-pending.csv` | **140 geprüfte Kandidaten** ohne Feed. robots.txt erlaubt Zugriff, brauchen nur eine manuelle Freigabe. |
| `blocked-sources.json` | **55 gesperrte Quellen** mit Begründung. Damit die Blocklist nicht neu diskutiert werden muss. |
| `events-snapshot.json` | **808 normalisierte Events** zum Seeden einer Datenbank. |
| `summary.json` | Die Zahlen maschinenlesbar. |

## Spalten in `venues-with-feeds`

`key, name, type, district, lat, lng, address, homepage, ingest_method,
endpoint_url, osm_id, clearance, crawl_delay_s, robots_checked_at`

`ingest_method` ist einer von:

- `wp_rest` — WordPress REST, The Events Calendar. Sauberste Quelle.
- `jsonld` — JSON-LD im Seitenquelltext.
- `ics` — iCal-Export.
- `rss` — eventspezifischer RSS-Feed. **Liefert selten brauchbare Startzeiten**,
  siehe unten.
- `html_llm` — kein Feed, aber manuell freigegebene Programmseite. Braucht den
  LLM-Extractor.

## Felder in `events-snapshot.json`

```
source_key, source_url, title, starts_at, ends_at, venue_name, address,
lat, lng, price_min, price_max, is_free, ticket_url, lineup[], category[],
ingest_method
```

Nur Fakten. **Keine fremden Beschreibungstexte, keine fremden Bilder** — das ist
Absicht und sollte beim Weiterverwenden so bleiben.

`price_min: null` heißt **unbekannt**, nicht kostenlos. Für kostenlos gibt es
`is_free`.

## Drei Dinge, die beim Weiterverwenden wichtig sind

**Endpunkte veralten.** Die `jsonld`-Einträge zeigen teils auf die Detailseite
eines konkreten Events. Nicht fest verdrahten — die Programmübersicht der Domain
nehmen und den Detail-Links folgen.

**Die 10 RSS-Quellen sind formal grün, liefern aber 0 Events.** Ein RSS-`pubDate`
ist der Veröffentlichungszeitpunkt des Posts, nicht der Eventbeginn. Für echte
Daten muss die verlinkte Seite ausgelesen werden.

**Fünf Clubs liefern nichts**, weil ihr Programm clientseitig lädt: ://about
blank, Else, Humboldthain, Prince Charles, Sisyphos. Sie stehen bewusst als
`green` in der Liste — die Quelle ist freigegeben, nur der Abruf scheitert an
JavaScript. Playwright wäre der nächste Schritt.

## Lizenz der Daten

`venues-*.csv` enthalten Geo-Daten und OSM-IDs aus OpenStreetMap und stehen damit
unter **ODbL 1.0**. © OpenStreetMap contributors. Bei Weitergabe muss die
Attribution mit.

Die Event-Daten sind Fakten (Datum, Zeit, Venue, Preis, Lineup) und nicht
urheberrechtlich geschützt.
