# Datenpolitik

Warum dieses Projekt keine Aggregatoren scrapt, und wo im Code das durchgesetzt wird.

> Kurzfassung: robots.txt ist nur eines von zwei Toren. Das eigentliche Risiko ist
> das Datenbankherstellerrecht — und das gilt unabhängig davon, was in der
> robots.txt steht.

## Die Rechtslage in vier Zeilen

- **§ 87b UrhG / EU-Datenbankrichtlinie:** Wer wesentliche Teile einer fremden
  Event-Datenbank entnimmt, verletzt das Sui-generis-Datenbankrecht. Das ist der
  Punkt, an dem Aggregatoren-Scraping tatsächlich scheitert — nicht an robots.txt.
- **§ 44b UrhG (Text- und Data-Mining):** Die Schranke existiert, aber ein
  maschinenlesbarer Nutzungsvorbehalt ist eine wirksame Rechtevorbehaltung.
- **Fakten sind nicht schutzfähig.** Datum, Uhrzeit, Venue, Preis, Lineup dürfen
  genutzt werden. **Beschreibungstexte und Fotos sind es sehr wohl.**
- **robots.txt und ToS sind zwei getrennte Tore.** Eines zu passieren ist keine
  Erlaubnis für das andere.

## Was daraus folgt

**Blockiert — nie ingesten, nur verlinken:**
`ra.co`, `rausgegangen.de`, `luma.com` / `lu.ma`, `dice.fm`, `eventim.de`,
`eventbrite.com`, Instagram, Facebook Events.

Diese Domains stehen in [`sources-allowlist.json`](sources-allowlist.json) **und**
zusätzlich hart in `policy.HARD_BLOCK_SUFFIXES` — doppelt, damit ein vergessener
JSON-Eintrag das Gate nicht öffnet. Sie werden trotzdem in die Registry gepusht,
mit `clearance = blocked`: der Audit-Trail ist es, der verhindert, dass jemand
ra.co nächste Woche versehentlich wieder einträgt.

**Erlaubt:**

- Offene APIs und Open Data (kulturdaten.berlin, Berlin Open Data, OpenStreetMap)
- Feeds, die eine Venue auf ihrer **eigenen** Domain für Maschinen veröffentlicht
  (JSON-LD, ICS, RSS, WordPress REST)
- Die eigene Programmseite einer Venue, per generischem HTML→LLM-Extractor — aber
  nur nach **manueller Freigabe durch einen Menschen**

## Wie der Code das durchsetzt

**Gate 1 — Domain-Blocklist.** `policy.blocked_reason(url)` prüft Host und alle
Subdomains gegen beide Listen.

**Gate 2 — robots.txt.** Pro konkretem Pfad, für unseren User-Agent, inklusive
`Crawl-delay`. Failure-Policy: keine robots.txt (4xx) heißt erlaubt — so sieht es
der Standard vor. Ein 5xx oder ein Netzwerkfehler heißt _unbekannt_, und unbekannt
behandeln wir als verboten. Lieber eine Venue verpassen als ungefragt crawlen.

Beide Gates sitzen in `fetcher.PoliteFetcher`, dem einzigen Weg, auf dem dieser
Worker HTTP-Requests stellt. **Es gibt kein Bypass-Flag, und es wird keines
eingebaut — auch nicht kurz für eine Demo.**

Nachweisbar per Kommando:

```bash
python -m berlinbot.cli guard-test
```

**Gate 3 — Clearance beim Ingest.** `policy.assert_ingestable(row)` verlangt
`clearance == "green"` **und** `robots_status == "allowed"`. `registry.green()` ist
der einzige Weg, überhaupt an eine Quellenliste zu kommen.

**Gate 4 — die Datenbank.** Ein Trigger auf `events` schlägt fehl, wenn die
referenzierte Quelle nicht freigegeben ist:

```sql
create trigger events_require_green_source
  before insert or update of source_id on public.events
  for each row execute function public.assert_green_source();
```

Damit hängt die Compliance nicht am Wohlverhalten des Worker-Codes.

## Fakten only — strukturell, nicht per Konvention

Das JSON-Schema des LLM-Extractors hat **kein Beschreibungsfeld**. Fremde Texte
können also nicht versehentlich in der Datenbank landen — nicht einmal im
Rohdatensatz. Der Prompt verbietet das Kopieren zusätzlich explizit.

`description_ours` in der Datenbank heißt bewusst so: dort gehört nur eigene,
generierte Copy hinein. `image_url` wird nur mit eigenen oder ausdrücklich
lizenzierten Bildern befüllt.

Jedes Event trägt `source_url`, und die App muss diesen Rücklink sichtbar anzeigen.
Das ist die Gegenleistung dafür, dass wir die Fakten nutzen.

## Höflicher Bot

- `User-Agent: BerlinEventsBot/0.1 (+https://<domain>/bot; <kontakt>)` — mit
  erreichbarer Kontaktadresse
- Concurrency **1 pro Host**, per Lock erzwungen
- `Crawl-delay` aus robots.txt wird respektiert, Minimum 5 s
- Conditional GET mit ETag / Last-Modified, plus 24-h-Cache: dieselbe Seite wird
  nicht zweimal binnen einer Stunde angefragt

## Der ehrliche Rest

Die manuelle Freigabe (`cli clear`) verschiebt eine Entscheidung auf einen
Menschen — sie ersetzt sie nicht. Ein Betreiber, der 21 Clubs freigibt, sollte
wissen, was er freigibt. Das Kommando verweigert deshalb alles, was die
technischen Gates nicht passiert: blockierte Domains und robots-verbotene Seiten
lassen sich auch manuell nicht freischalten.

Der nachhaltigere Weg bleibt Partnerschaft statt Extraktion: ein Self-Service-Formular
für Venues, Affiliate-Programme bei Dice und Eventim, Opt-in-Integrationen für
Instagram-only-Läden. Scraping skaliert schlechter als Angebot.
