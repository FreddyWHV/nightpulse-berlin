"""Clean and sanity-check raw events before they go anywhere near the database.

Detail-page crawling picks up a venue's archive alongside its programme, and
JSON-LD in the wild contains genuinely broken dates (year 0002, year 0021). Both
are filtered here rather than in the adapters, so every source benefits.
"""

from __future__ import annotations

import html
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from dateutil import parser as dateparser

# How far back an event may start and still be shown (a night in progress).
PAST_GRACE = timedelta(hours=12)
# Nobody announces a club night three years out; anything further is a parse error.
FUTURE_LIMIT = timedelta(days=730)


def clean_text(value) -> str:
    if not value:
        return ""
    text = html.unescape(str(value))
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _as_dt(value):
    if not value:
        return None
    try:
        dt = dateparser.parse(str(value))
    except (ValueError, OverflowError, TypeError):
        return None
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def normalize(events: List[Dict], now=None) -> Tuple[List[Dict], Dict[str, int]]:
    now = now or datetime.now(timezone.utc)
    dropped = {"no_title": 0, "no_start": 0, "past": 0, "implausible": 0, "duplicate": 0}
    seen = set()
    out: List[Dict] = []

    for ev in events:
        title = clean_text(ev.get("title"))
        if not title:
            dropped["no_title"] += 1
            continue
        start = _as_dt(ev.get("starts_at"))
        if start is None:
            dropped["no_start"] += 1
            continue
        if start.year < 1990 or start > now + FUTURE_LIMIT:
            dropped["implausible"] += 1
            continue
        if start < now - PAST_GRACE:
            dropped["past"] += 1
            continue

        key = (ev.get("source_key"), title.lower(), start.isoformat()[:16])
        if key in seen:
            dropped["duplicate"] += 1
            continue
        seen.add(key)

        ev = dict(ev)
        ev["title"] = title[:300]
        ev["starts_at"] = start.isoformat()
        end = _as_dt(ev.get("ends_at"))
        ev["ends_at"] = end.isoformat() if end and end > start else None
        ev["venue_name"] = clean_text(ev.get("venue_name")) or None
        ev["address"] = clean_text(ev.get("address")) or None
        ev["lineup"] = [clean_text(x) for x in (ev.get("lineup") or []) if clean_text(x)]
        ev["category"] = [clean_text(x) for x in (ev.get("category") or []) if clean_text(x)]
        out.append(ev)

    out.sort(key=lambda e: e["starts_at"])
    return out, dropped
