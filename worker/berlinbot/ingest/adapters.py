"""Four small adapters, one per feed type, all producing the same raw event dict.

Hard rule (CLAUDE.md): **facts only**. Date, time, venue, price, lineup, ticket link.
No third-party description and no third-party image is carried across — not into the
raw record either, so it cannot leak into the app by accident later. Our own copy is
generated in the enrich step.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from bs4 import BeautifulSoup
from dateutil import parser as dateparser

from ..discovery.probe import jsonld_events
from ..fetcher import PoliteFetcher

BERLIN_TZ = "Europe/Berlin"


def _parse_dt(value) -> Optional[str]:
    if not value:
        return None
    try:
        dt = dateparser.parse(str(value))
    except (ValueError, OverflowError):
        return None
    if dt is None:
        return None
    return dt.isoformat()


def _price(value) -> Optional[float]:
    if value is None:
        return None
    text = str(value).replace(",", ".")
    m = re.search(r"\d+(?:\.\d+)?", text)
    return float(m.group()) if m else None


def _blank(source: Dict) -> Dict:
    return {
        "source_key": source["key"],
        "source_url": None,
        "source_event_id": None,
        "title": None,
        "starts_at": None,
        "ends_at": None,
        "venue_name": source["name"],
        "lat": (source.get("geo") or {}).get("lat"),
        "lng": (source.get("geo") or {}).get("lng"),
        "address": source.get("address"),
        "price_min": None,
        "price_max": None,
        "is_free": None,
        "ticket_url": None,
        "lineup": [],
        "category": [],
        "ingest_method": source["ingest_method"],
    }


# --- wp_rest (The Events Calendar) ---------------------------------------
def from_wp_rest(source: Dict, payload) -> List[Dict]:
    events = payload.get("events", []) if isinstance(payload, dict) else (payload or [])
    out = []
    for ev in events:
        if not isinstance(ev, dict):
            continue
        row = _blank(source)
        row["source_event_id"] = str(ev.get("id") or ev.get("uid") or "")
        row["source_url"] = ev.get("url") or ev.get("link")
        title = ev.get("title")
        if isinstance(title, dict):  # wp/v2 shape: {"rendered": "..."}
            title = title.get("rendered")
        row["title"] = BeautifulSoup(str(title or ""), "lxml").get_text().strip() or None
        row["starts_at"] = _parse_dt(ev.get("start_date") or ev.get("utc_start_date") or ev.get("date"))
        row["ends_at"] = _parse_dt(ev.get("end_date") or ev.get("utc_end_date"))
        venue = ev.get("venue") or {}
        if isinstance(venue, dict) and venue:
            row["venue_name"] = venue.get("venue") or row["venue_name"]
            row["lat"] = venue.get("geo_lat") or row["lat"]
            row["lng"] = venue.get("geo_lng") or row["lng"]
            row["address"] = venue.get("address") or row["address"]
        cost = ev.get("cost_details") or {}
        values = [_price(v) for v in (cost.get("values") or []) if _price(v) is not None]
        if values:
            row["price_min"], row["price_max"] = min(values), max(values)
        elif ev.get("cost") in ("", None):
            pass
        else:
            row["price_min"] = _price(ev.get("cost"))
        row["is_free"] = bool(row["price_min"] == 0) if row["price_min"] is not None else None
        row["category"] = [c.get("name") for c in (ev.get("categories") or []) if isinstance(c, dict) and c.get("name")]
        if row["title"] and row["starts_at"]:
            out.append(row)
    return out


# --- jsonld ---------------------------------------------------------------
def from_jsonld(source: Dict, html: str, page_url: str) -> List[Dict]:
    out = []
    for ev in jsonld_events(html):
        row = _blank(source)
        row["source_url"] = ev.get("url") or page_url
        row["source_event_id"] = str(ev.get("@id") or ev.get("identifier") or ev.get("url") or "")
        row["title"] = str(ev.get("name") or "").strip() or None
        row["starts_at"] = _parse_dt(ev.get("startDate"))
        row["ends_at"] = _parse_dt(ev.get("endDate"))
        loc = ev.get("location")
        if isinstance(loc, list):
            loc = loc[0] if loc else None
        if isinstance(loc, dict):
            row["venue_name"] = loc.get("name") or row["venue_name"]
            geo = loc.get("geo") if isinstance(loc.get("geo"), dict) else {}
            row["lat"] = geo.get("latitude") or row["lat"]
            row["lng"] = geo.get("longitude") or row["lng"]
            addr = loc.get("address")
            if isinstance(addr, dict):
                row["address"] = " ".join(
                    str(addr.get(k)) for k in ("streetAddress", "postalCode", "addressLocality") if addr.get(k)
                ) or row["address"]
            elif isinstance(addr, str):
                row["address"] = addr
        offers = ev.get("offers")
        offers = offers if isinstance(offers, list) else ([offers] if isinstance(offers, dict) else [])
        prices = [_price(o.get("price")) for o in offers if isinstance(o, dict)]
        prices = [p for p in prices if p is not None]
        if prices:
            row["price_min"], row["price_max"] = min(prices), max(prices)
            row["is_free"] = min(prices) == 0
        for o in offers:
            if isinstance(o, dict) and o.get("url"):
                row["ticket_url"] = o["url"]
                break
        performers = ev.get("performer")
        performers = performers if isinstance(performers, list) else ([performers] if performers else [])
        row["lineup"] = [
            (p.get("name") if isinstance(p, dict) else str(p)) for p in performers if p
        ]
        if row["title"] and row["starts_at"]:
            out.append(row)
    return out


# --- ics ------------------------------------------------------------------
def _unfold_ics(text: str) -> List[str]:
    lines: List[str] = []
    for raw in text.splitlines():
        if raw[:1] in (" ", "\t") and lines:
            lines[-1] += raw[1:]
        else:
            lines.append(raw)
    return lines


def from_ics(source: Dict, text: str) -> List[Dict]:
    out: List[Dict] = []
    current: Optional[Dict[str, str]] = None
    for line in _unfold_ics(text):
        line = line.strip()
        if line == "BEGIN:VEVENT":
            current = {}
            continue
        if line == "END:VEVENT":
            if current is not None:
                row = _blank(source)
                row["source_event_id"] = current.get("UID")
                row["source_url"] = current.get("URL") or source.get("endpoint_url")
                row["title"] = current.get("SUMMARY") or None
                row["starts_at"] = _parse_dt(current.get("DTSTART"))
                row["ends_at"] = _parse_dt(current.get("DTEND"))
                if current.get("LOCATION"):
                    row["address"] = current["LOCATION"]
                if row["title"] and row["starts_at"]:
                    # NOTE: RRULE is not expanded yet — recurring club nights show up
                    # once. Fine for the snapshot, revisit if a green source uses it.
                    out.append(row)
            current = None
            continue
        if current is None or ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.split(";", 1)[0].upper()
        if key in ("UID", "SUMMARY", "URL", "DTSTART", "DTEND", "LOCATION", "RRULE"):
            current[key] = value.replace("\\,", ",").replace("\\n", " ").strip()
    return out


# --- rss ------------------------------------------------------------------
def from_rss(source: Dict, text: str) -> List[Dict]:
    import feedparser

    out = []
    for entry in feedparser.parse(text).entries:
        row = _blank(source)
        row["source_url"] = entry.get("link")
        row["source_event_id"] = entry.get("id") or entry.get("link")
        row["title"] = (entry.get("title") or "").strip() or None
        # An RSS <pubDate> is when the post was published, not when the party starts.
        # We deliberately leave starts_at empty; the LLM step resolves it from the
        # linked page, and anything without a parseable start time gets dropped.
        row["needs_time_resolution"] = True
        if row["title"] and row["source_url"]:
            out.append(row)
    return out


MAX_DETAIL_PAGES = 30


def _dedupe(events: List[Dict]) -> List[Dict]:
    """Same event on the listing and on its detail page is one event."""
    seen, out = set(), []
    for ev in events:
        key = (ev.get("title"), ev.get("starts_at"))
        if key in seen:
            continue
        seen.add(key)
        out.append(ev)
    return out


def _detail_prefix(endpoint: str) -> Optional[str]:
    """`https://x.de/de/events/some-party` -> `/de/events/`  (None for a listing URL)."""
    from urllib.parse import urlparse

    segments = [s for s in urlparse(endpoint).path.split("/") if s]
    if len(segments) < 2:
        return None
    return "/" + "/".join(segments[:-1]) + "/"


def _detail_links(html: str, base: str, prefix: str) -> List[str]:
    from urllib.parse import urljoin, urlparse

    soup = BeautifulSoup(html, "lxml")
    host = urlparse(base).netloc
    seen: List[str] = []
    for a in soup.find_all("a", href=True):
        url = urljoin(base, a["href"]).split("#")[0].split("?")[0]
        p = urlparse(url)
        if p.netloc != host or not p.path.startswith(prefix):
            continue
        if p.path.rstrip("/") == prefix.rstrip("/"):
            continue  # that's the listing itself
        if url not in seen:
            seen.append(url)
    return seen


async def _jsonld_via_detail_pages(fetcher: PoliteFetcher, source: Dict) -> List[Dict]:
    """Some venues only put JSON-LD on the event detail page, not on the listing.

    Then the honest way round is: fetch the listing, follow its event links, read the
    structured data each page publishes. Same politeness rules, same facts-only rule.
    """
    endpoint = source["endpoint_url"]
    prefix = _detail_prefix(endpoint)
    if not prefix:
        return []

    listings = list(source.get("event_pages") or [])
    parent = endpoint[: endpoint.index(prefix) + len(prefix)]
    if parent not in listings:
        listings.insert(0, parent)

    links: List[str] = []
    for listing in listings:
        res = await fetcher.get(listing)
        if res.ok and res.is_html:
            for url in _detail_links(res.text, res.url, prefix):
                if url not in links:
                    links.append(url)
    if endpoint not in links:
        links.insert(0, endpoint)

    events: List[Dict] = []
    for url in links[:MAX_DETAIL_PAGES]:
        res = await fetcher.get(url)
        if res.ok and res.is_html:
            events.extend(from_jsonld(source, res.text, res.url))
    return events


async def pull(fetcher: PoliteFetcher, source: Dict) -> List[Dict]:
    """Run the right adapter for one green source. Caller must have passed the gate."""
    method, endpoint = source["ingest_method"], source.get("endpoint_url")
    if method == "html_llm":
        from datetime import date

        from .llm import pull_html_llm

        return _dedupe(await pull_html_llm(fetcher, source, date.today().isoformat()))
    if not endpoint:
        return []
    res = await fetcher.get(endpoint)
    if not res.ok:
        return []
    if method == "wp_rest":
        try:
            return from_wp_rest(source, json.loads(res.text))
        except json.JSONDecodeError:
            return []
    if method == "jsonld":
        events = from_jsonld(source, res.text, res.url)
        if len(events) <= 1 and _detail_prefix(endpoint):
            crawled = await _jsonld_via_detail_pages(fetcher, source)
            if len(crawled) > len(events):
                return _dedupe(crawled)
        return _dedupe(events)
    if method == "ics":
        return from_ics(source, res.text)
    if method == "rss":
        return from_rss(source, res.text)
    return []
