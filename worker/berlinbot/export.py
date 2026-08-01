"""Handover package: everything a downstream project needs, without this codebase.

Produces plain CSV/JSON under data/handover/ so another project can pick up the
venue list and the event snapshot without importing anything from here.
"""

from __future__ import annotations

import csv
import json
from typing import Dict, List

from . import config, registry

HANDOVER_DIR = config.DATA_DIR / "handover"

VENUE_FIELDS = [
    "key", "name", "type", "district", "lat", "lng", "address",
    "homepage", "ingest_method", "endpoint_url", "osm_id",
    "clearance", "crawl_delay_s", "robots_checked_at",
]

CANDIDATE_FIELDS = ["name", "type", "district", "lat", "lng", "homepage", "reason", "osm_id"]


def _venue_row(r: Dict) -> Dict:
    geo = r.get("geo") or {}
    return {
        "key": r["key"],
        "name": r["name"],
        "type": r.get("type"),
        "district": r.get("district"),
        "lat": geo.get("lat"),
        "lng": geo.get("lng"),
        "address": r.get("address"),
        "homepage": r.get("homepage"),
        "ingest_method": r.get("ingest_method"),
        "endpoint_url": r.get("endpoint_url"),
        "osm_id": r.get("osm_id"),
        "clearance": r.get("clearance"),
        "crawl_delay_s": r.get("crawl_delay_s"),
        "robots_checked_at": r.get("robots_checked_at"),
    }


def _write_csv(path, fields: List[str], rows: List[Dict]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k) for k in fields})


def run() -> Dict[str, int]:
    HANDOVER_DIR.mkdir(parents=True, exist_ok=True)
    rows = registry.load()

    # 1. The working sources: venues that publish a machine-readable programme,
    #    or whose own site a human cleared for the LLM extractor.
    feeds = sorted(
        (_venue_row(r) for r in rows if r["clearance"] == "green"),
        key=lambda r: (r["ingest_method"], r["name"].lower()),
    )
    _write_csv(HANDOVER_DIR / "venues-with-feeds.csv", VENUE_FIELDS, feeds)
    (HANDOVER_DIR / "venues-with-feeds.json").write_text(
        json.dumps(feeds, indent=2, ensure_ascii=False), "utf-8"
    )

    # 2. The backlog: probed, robots-allowed, but no feed found. Each is a
    #    candidate for manual clearance — the cheapest way to grow coverage.
    pending = sorted(
        (
            dict(_venue_row(r), reason=(r.get("clearance_note") or "")[:120])
            for r in rows
            if r["clearance"] == "review_pending"
        ),
        key=lambda r: (r["district"] or "zzz", r["name"].lower()),
    )
    _write_csv(HANDOVER_DIR / "venues-review-pending.csv", CANDIDATE_FIELDS, pending)

    # 3. The blocklist, so the next project does not re-litigate it.
    blocked = sorted(
        (
            {"name": r["name"], "homepage": r.get("homepage"), "reason": r.get("clearance_note")}
            for r in rows
            if r["clearance"] == "blocked"
        ),
        key=lambda r: r["name"].lower(),
    )
    (HANDOVER_DIR / "blocked-sources.json").write_text(
        json.dumps(blocked, indent=2, ensure_ascii=False), "utf-8"
    )

    # 4. The event snapshot, already normalized.
    events_src = config.DATA_DIR / "raw_events.jsonl"
    n_events = 0
    if events_src.exists():
        events = [json.loads(l) for l in events_src.read_text("utf-8").splitlines() if l.strip()]
        n_events = len(events)
        (HANDOVER_DIR / "events-snapshot.json").write_text(
            json.dumps(events, indent=2, ensure_ascii=False), "utf-8"
        )

    counts = {
        "venues_with_feeds": len(feeds),
        "review_pending": len(pending),
        "blocked": len(blocked),
        "events": n_events,
    }
    (HANDOVER_DIR / "summary.json").write_text(
        json.dumps({"counts": counts, "generated_from": "worker/data/sources.json"}, indent=2),
        "utf-8",
    )
    return counts
