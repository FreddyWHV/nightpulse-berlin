"""Tier 3: one generic HTML→LLM extractor. No bespoke parser per venue.

Runs only against sources a human has cleared green (`cli clear`). The compliance
gate still applies on every fetch — this reads the venue's own programme page, never
an aggregator.

Facts only. The prompt forbids copying the venue's own descriptions, and the schema
has no description field, so there is nowhere for third-party copy to land.
"""

from __future__ import annotations

import json
import os
import re
from typing import Dict, List, Optional

from bs4 import BeautifulSoup

from ..fetcher import PoliteFetcher

MODEL = os.environ.get("BERLINBOT_MODEL", "claude-opus-5")
MAX_CHARS = 40_000
MAX_PAGES = 3

EVENT_SCHEMA = {
    "type": "object",
    "properties": {
        "events": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Event/party name as printed, without the venue name or date appended"},
                    "starts_at": {"type": "string", "description": "ISO 8601 local Berlin time, e.g. 2026-08-14T23:00:00. Omit the event entirely if no start date is stated."},
                    "ends_at": {"type": ["string", "null"]},
                    "price_min": {"type": ["number", "null"], "description": "EUR. null if not stated — do not guess, and do not use 0 for unknown."},
                    "price_max": {"type": ["number", "null"]},
                    "is_free": {"type": ["boolean", "null"]},
                    "ticket_url": {"type": ["string", "null"]},
                    "lineup": {"type": "array", "items": {"type": "string"}, "description": "Artist/DJ names only"},
                    "category": {"type": "array", "items": {"type": "string"}, "description": "e.g. club, concert, party, talk, market"},
                },
                "required": ["title", "starts_at", "ends_at", "price_min", "price_max", "is_free", "ticket_url", "lineup", "category"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["events"],
    "additionalProperties": False,
}

SYSTEM = """You extract event facts from the HTML text of a Berlin venue's own website.

Rules:
- Extract FACTS ONLY: title, date/time, price, lineup, ticket link, category.
- Never copy the venue's description, blurb, or marketing text. There is no field for it.
- Never invent a date. If an entry has no stated start date, leave it out entirely.
- Dates are German-format and Berlin local time. "Fr 14.08." in a 2026 programme means
  2026-08-14. Club nights starting after midnight belong to the date the night opens on.
- If a date is given with no time at all, assume 23:00 for a club night and 20:00 for a
  concert or seated event. Do not use 00:00 — it reads as midnight and is almost never
  what the venue meant.
- A price of "AK 15€" means price_min 15. "Eintritt frei" means is_free true.
  Unknown price is null, never 0.
- Ignore navigation, newsletter forms, imprint, and past events."""


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "noscript", "svg"]):
        tag.decompose()
    text = soup.get_text("\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()[:MAX_CHARS]


def _client():
    import anthropic

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY is not set — put it in worker/.env")
    return anthropic.Anthropic()


def extract(text: str, venue_name: str, page_url: str, today: str) -> List[Dict]:
    client = _client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=SYSTEM,
        output_config={
            "effort": "low",
            "format": {"type": "json_schema", "schema": EVENT_SCHEMA},
        },
        messages=[
            {
                "role": "user",
                "content": (
                    "Venue: %s\nPage: %s\nToday is %s — resolve relative dates and "
                    "bare day/month against this, and drop anything already past.\n\n"
                    "Page text:\n%s" % (venue_name, page_url, today, text)
                ),
            }
        ],
    )
    payload = next(b.text for b in response.content if b.type == "text")
    return json.loads(payload).get("events", [])


async def pull_html_llm(fetcher: PoliteFetcher, source: Dict, today: str) -> List[Dict]:
    """Fetch the venue's programme pages and run one extraction call per page."""
    from .adapters import _blank, _price, _parse_dt

    pages = [source.get("endpoint_url") or source["homepage"]]
    for url in (source.get("event_pages") or []):
        if url not in pages:
            pages.append(url)

    out: List[Dict] = []
    for url in pages[:MAX_PAGES]:
        res = await fetcher.get(url)
        if not res.ok or not res.is_html:
            continue
        text = html_to_text(res.text)
        if len(text) < 200:
            continue
        try:
            events = extract(text, source["name"], res.url, today)
        except Exception as exc:
            print("    llm extract failed for %s: %s" % (url, type(exc).__name__))
            continue
        for ev in events:
            row = _blank(source)
            row["source_url"] = ev.get("ticket_url") or res.url
            row["source_event_id"] = None  # the sink derives a stable id from title+start
            row["title"] = ev.get("title")
            row["starts_at"] = _parse_dt(ev.get("starts_at"))
            row["ends_at"] = _parse_dt(ev.get("ends_at"))
            row["price_min"] = _price(ev.get("price_min"))
            row["price_max"] = _price(ev.get("price_max"))
            row["is_free"] = ev.get("is_free")
            row["ticket_url"] = ev.get("ticket_url")
            row["lineup"] = ev.get("lineup") or []
            row["category"] = ev.get("category") or []
            out.append(row)
    return out
