"""Capability probe: does this venue publish its programme *for machines*?

For each candidate we look, in order of how much we trust the result:

  wp_rest  /wp-json/tribe/events/v1/events   (The Events Calendar — very common in Berlin)
  jsonld   <script type="application/ld+json"> with @type Event
  ics      an .ics calendar export
  rss      an events RSS/Atom feed

A hit means the venue published a structured feed on its own domain, on purpose.
That is a clean, permanent source. A miss does *not* become an html_llm source
automatically — it lands in ``review_pending`` and needs a human to clear it.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from .. import policy
from ..fetcher import FetchResult, PoliteFetcher

WP_PATHS = [
    "/wp-json/tribe/events/v1/events",
    "/wp-json/wp/v2/tribe_events",
]
ICS_PATHS = [
    "/events.ics",
    "/veranstaltungen.ics",
    "/programm.ics",
    "/?post_type=tribe_events&ical=1",
]
# An event-specific RSS path carries the venue's programme. A bare /feed/ is the
# site's blog and usually contains news posts, not parties — we record it, but it
# does not on its own make a venue a usable event source.
RSS_EVENT_PATHS = [
    "/events/feed/",
    "/veranstaltungen/feed/",
    "/programm/feed/",
    "/termine/feed/",
    "/konzerte/feed/",
]
RSS_GENERIC_PATHS = ["/feed/", "/feed", "/rss.php", "/rss"]
RSS_PATHS = RSS_EVENT_PATHS + RSS_GENERIC_PATHS
EVENT_PAGE_HINTS = (
    "programm",
    "veranstaltungen",
    "events",
    "kalender",
    "termine",
    "lineup",
    "party",
    "konzerte",
    "agenda",
)

EVENT_TYPES = {
    "event", "musicevent", "socialevent", "festival", "theaterevent",
    "danceevent", "screeningevent", "exhibitionevent", "comedyevent",
    "eventseries", "publicationevent", "foodevent",
}


def _iter_jsonld_nodes(blob):
    """Yield every dict in a JSON-LD blob, including @graph and nested lists."""
    stack = [blob]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            yield node
            for key in ("@graph", "itemListElement", "item", "subEvent", "events"):
                if key in node:
                    stack.append(node[key])
        elif isinstance(node, list):
            stack.extend(node)


def jsonld_events(html: str) -> List[dict]:
    events: List[dict] = []
    soup = BeautifulSoup(html, "lxml")
    for tag in soup.find_all("script", attrs={"type": re.compile("ld\\+json", re.I)}):
        raw = tag.string or tag.get_text() or ""
        raw = raw.strip()
        if not raw:
            continue
        try:
            blob = json.loads(raw)
        except Exception:
            continue
        for node in _iter_jsonld_nodes(blob):
            types = node.get("@type")
            types = [types] if isinstance(types, str) else (types or [])
            if any(str(t).lower() in EVENT_TYPES for t in types):
                # Facts only. We deliberately do not carry over description/image here.
                if node.get("startDate") or node.get("name"):
                    events.append(node)
    return events


def feed_links(html: str, base: str) -> List[Tuple[str, str]]:
    """<link rel=alternate> hints: (kind, url)."""
    out = []
    soup = BeautifulSoup(html, "lxml")
    for link in soup.find_all("link", rel=True):
        rel = " ".join(link.get("rel") or []).lower()
        typ = (link.get("type") or "").lower()
        href = link.get("href")
        if not href or "alternate" not in rel:
            continue
        if "rss" in typ or "atom" in typ:
            out.append(("rss", urljoin(base, href)))
        elif "calendar" in typ or href.endswith(".ics"):
            out.append(("ics", urljoin(base, href)))
    return out


def event_page_links(html: str, base: str, limit: int = 2) -> List[str]:
    soup = BeautifulSoup(html, "lxml")
    host = urlparse(base).netloc
    seen, out = set(), []
    for a in soup.find_all("a", href=True):
        url = urljoin(base, a["href"])
        p = urlparse(url)
        if p.netloc != host or p.scheme not in ("http", "https"):
            continue
        path = p.path.lower().rstrip("/")
        if not path or path in seen:
            continue
        text = (a.get_text() or "").strip().lower()
        if any(h in path for h in EVENT_PAGE_HINTS) or any(h in text for h in EVENT_PAGE_HINTS):
            seen.add(path)
            out.append(url.split("#")[0])
        if len(out) >= limit:
            break
    return out


def _looks_like_ics(res: FetchResult) -> bool:
    return "BEGIN:VCALENDAR" in res.text[:2000].upper()


def _looks_like_feed(res: FetchResult) -> bool:
    head = res.text[:2000].lower()
    return "<rss" in head or "<feed" in head


async def probe_venue(fetcher: PoliteFetcher, cand: Dict) -> Dict:
    origin = cand["origin"]
    home_url = cand.get("website") or origin
    report: Dict = {
        "name": cand["name"],
        "origin": origin,
        "kind": cand.get("kind"),
        "robots_status": "unknown",
        "capabilities": [],
        "notes": [],
    }

    blocked = policy.blocked_reason(origin)
    if blocked:
        report["robots_status"] = "n/a"
        report["notes"].append("blocked domain: " + blocked)
        return report

    home = await fetcher.get(home_url)
    if home.skipped_reason:
        report["robots_status"] = "disallowed" if home.skipped_reason.startswith("robots") else "unknown"
        report["notes"].append(home.skipped_reason)
        return report
    report["robots_status"] = "allowed"
    if not home.ok:
        report["notes"].append("homepage HTTP %s" % home.status)
        return report

    # 1. WordPress REST (The Events Calendar and friends)
    for path in WP_PATHS:
        data = await fetcher.get_json(origin + path)
        if isinstance(data, dict) and data.get("events"):
            report["capabilities"].append(
                {"method": "wp_rest", "endpoint": origin + path, "sample_count": len(data["events"])}
            )
            break
        if isinstance(data, list) and data:
            report["capabilities"].append(
                {"method": "wp_rest", "endpoint": origin + path, "sample_count": len(data)}
            )
            break

    # 2. JSON-LD on the homepage and on up to two programme pages
    pages = [(home_url, home)]
    for url in event_page_links(home.text, home.url, limit=4):
        res = await fetcher.get(url)
        if res.ok and res.is_html:
            pages.append((url, res))

    # Prefer the page that carries the most events, and on a tie the shallower URL —
    # a listing page stays useful across crawls, a single event's detail page does not.
    def _rank(url: str, count: int):
        depth = len([p for p in urlparse(url).path.split("/") if p])
        return (-count, depth)

    best_jsonld = None
    best_rank = None
    for url, res in pages:
        evs = jsonld_events(res.text)
        if not evs:
            continue
        rank = _rank(url, len(evs))
        if best_rank is None or rank < best_rank:
            best_rank = rank
            best_jsonld = {
                "method": "jsonld",
                "endpoint": url,
                "sample_count": len(evs),
                "sample_titles": [str(e.get("name"))[:80] for e in evs[:3]],
                "sample_start": str(evs[0].get("startDate")) if evs[0].get("startDate") else None,
            }
    if best_jsonld:
        report["capabilities"].append(best_jsonld)
    report["event_pages"] = [u for u, _ in pages[1:]]

    # 3. declared alternate feeds + well-known paths
    declared = feed_links(home.text, home.url)
    for kind, url in declared:
        res = await fetcher.get(url)
        if res.ok and ((kind == "ics" and _looks_like_ics(res)) or (kind == "rss" and _looks_like_feed(res))):
            if kind == "rss" and not any(h in urlparse(url).path.lower() for h in EVENT_PAGE_HINTS):
                kind = "rss_blog"
            report["capabilities"].append({"method": kind, "endpoint": url, "declared": True})

    if not any(c["method"] == "ics" for c in report["capabilities"]):
        for path in ICS_PATHS:
            res = await fetcher.get(origin + path)
            if res.ok and _looks_like_ics(res):
                report["capabilities"].append({"method": "ics", "endpoint": origin + path})
                break

    if not any(c["method"] in ("rss", "rss_blog") for c in report["capabilities"]):
        for path in RSS_PATHS:
            res = await fetcher.get(origin + path)
            if res.ok and _looks_like_feed(res):
                method = "rss" if path in RSS_EVENT_PATHS else "rss_blog"
                report["capabilities"].append({"method": method, "endpoint": origin + path})
                break

    return report


async def probe_all(candidates: List[Dict], concurrency: Optional[int] = None, on_result=None) -> List[Dict]:
    """`on_result(report, candidate)` fires as each venue finishes.

    Results are handed over one at a time so a long run can be interrupted without
    losing everything it already found.
    """
    async with PoliteFetcher() as fetcher:
        sem = asyncio.Semaphore(concurrency or 8)

        async def one(cand):
            async with sem:
                try:
                    report = await probe_venue(fetcher, cand)
                except Exception as exc:
                    report = {
                        "name": cand["name"],
                        "origin": cand["origin"],
                        "kind": cand.get("kind"),
                        "robots_status": "unknown",
                        "capabilities": [],
                        "notes": ["probe error: %s: %s" % (type(exc).__name__, exc)],
                    }
                if on_result:
                    on_result(report, cand)
                return report

        return await asyncio.gather(*(one(c) for c in candidates))
