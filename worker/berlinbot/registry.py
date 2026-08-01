"""The sources registry — the table that enforces the policy.

One row per venue, shaped like the ``sources`` table in docs/gameplan.md so it can
be seeded straight into Supabase later. Clearance is assigned by rule:

  blocked domain            -> blocked
  robots disallows us       -> blocked
  machine-readable feed     -> green
  nothing found             -> review_pending   (never auto-green for html_llm)
"""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import datetime, timezone
from typing import Dict, List, Optional

from . import config, policy

METHOD_PRIORITY = ["wp_rest", "jsonld", "ics", "rss"]


def _slug(name: str, origin: str) -> str:
    base = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    base = re.sub(r"[^a-z0-9]+", "_", base.lower()).strip("_")
    host = policy.host_of(origin).split(".")[0]
    return (base or host)[:40]


def _best(capabilities: List[dict]) -> Optional[dict]:
    for method in METHOD_PRIORITY:
        for cap in capabilities:
            if cap["method"] == method:
                return cap
    return None


def row_from_report(report: Dict, cand: Dict) -> Dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    best = _best(report.get("capabilities") or [])
    blocked = policy.blocked_reason(report["origin"])

    if blocked:
        clearance, note = "blocked", blocked
    elif report.get("robots_status") == "disallowed":
        clearance, note = "blocked", "robots.txt disallows our user agent"
    elif report.get("robots_status") != "allowed":
        clearance, note = "review_pending", "; ".join(report.get("notes") or ["robots.txt status unknown"])
    elif best:
        clearance, note = "green", "venue publishes a machine-readable feed (%s)" % best["method"]
    elif any(c["method"] == "rss_blog" for c in report.get("capabilities") or []):
        clearance = "review_pending"
        note = ("only a generic site feed (/feed/) — that is the blog, not the programme; "
                "html_llm candidate, needs manual clearance")
    else:
        clearance = "review_pending"
        note = "no feed found — html_llm candidate, needs manual clearance before any ingest"

    return {
        "key": _slug(report["name"], report["origin"]),
        "name": report["name"],
        "homepage": cand.get("website") or report["origin"],
        "type": "club" if report.get("kind") in ("nightclub", "music_venue", "club") else "venue",
        "city": "Berlin",
        "district": cand.get("district"),
        "geo": {"lat": cand.get("lat"), "lng": cand.get("lng")},
        "address": " ".join(x for x in (cand.get("street"), cand.get("postcode")) if x) or None,
        "osm_id": cand.get("osm_id"),
        "ingest_method": best["method"] if best else "html_llm",
        "endpoint_url": best["endpoint"] if best else None,
        "robots_status": report.get("robots_status"),
        "robots_checked_at": now,
        "clearance": clearance,
        "clearance_note": note,
        "crawl_delay_s": config.DEFAULT_CRAWL_DELAY_S,
        "priority": 1,
        "parser_key": best["method"] if best else None,
        "health": "ok" if best else "unknown",
        "all_capabilities": report.get("capabilities") or [],
        "event_pages": report.get("event_pages") or [],
        "notes": report.get("notes") or [],
        "discovered_at": now,
    }


def save(rows: List[Dict]) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "policy": policy.ALLOWLIST["policy"],
        "counts": summarize(rows),
        "sources": rows,
    }
    config.SOURCES_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), "utf-8")


def load() -> List[Dict]:
    if not config.SOURCES_PATH.exists():
        return []
    return json.loads(config.SOURCES_PATH.read_text("utf-8"))["sources"]


def summarize(rows: List[Dict]) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for r in rows:
        out[r["clearance"]] = out.get(r["clearance"], 0) + 1
        if r["clearance"] == "green":
            out["green_" + r["ingest_method"]] = out.get("green_" + r["ingest_method"], 0) + 1
    return dict(sorted(out.items()))


def green(rows: Optional[List[Dict]] = None) -> List[Dict]:
    """The only rows the fetcher is ever allowed to run against."""
    rows = rows if rows is not None else load()
    out = []
    for r in rows:
        try:
            policy.assert_ingestable(r)
        except (policy.ClearanceError, policy.BlockedSourceError):
            continue
        out.append(r)
    return out
