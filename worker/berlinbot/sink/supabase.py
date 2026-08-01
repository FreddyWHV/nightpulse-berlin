"""Push the local registry and events into Supabase (PostgREST, service_role key).

The worker is the only writer. The app reads `app_events` / `app_venues` with the
anon key and never sees the base tables.

Environment:
  SUPABASE_URL=https://<ref>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-side only, never in the app
"""

from __future__ import annotations

import hashlib
import json
import os
from typing import Dict, Iterable, List, Optional

import httpx

CHUNK = 200


class SupabaseError(RuntimeError):
    pass


def _config() -> tuple:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise SupabaseError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set "
            "(put them in worker/.env, never in the app)"
        )
    return url, key


def _client() -> httpx.Client:
    url, key = _config()
    return httpx.Client(
        base_url=url + "/rest/v1",
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=representation",
        },
        timeout=60,
    )


def _wkt(lat, lng) -> Optional[str]:
    if lat is None or lng is None:
        return None
    return "SRID=4326;POINT(%s %s)" % (float(lng), float(lat))


def _chunks(rows: List[Dict], size: int = CHUNK) -> Iterable[List[Dict]]:
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def _upsert(client: httpx.Client, table: str, rows: List[Dict], on_conflict: str) -> List[Dict]:
    out: List[Dict] = []
    for chunk in _chunks(rows):
        resp = client.post("/" + table, params={"on_conflict": on_conflict}, content=json.dumps(chunk))
        if resp.status_code >= 300:
            raise SupabaseError("%s upsert failed (%s): %s" % (table, resp.status_code, resp.text[:800]))
        out.extend(resp.json())
    return out


# ------------------------------------------------------------------ sources ---
def source_payload(row: Dict) -> Dict:
    geo = row.get("geo") or {}
    return {
        "key": row["key"],
        "name": row["name"],
        "homepage": row.get("homepage"),
        "type": row.get("type") or "venue",
        "city": row.get("city") or "Berlin",
        "district": row.get("district"),
        "geo": _wkt(geo.get("lat"), geo.get("lng")),
        "address": row.get("address"),
        "osm_id": row.get("osm_id"),
        "ingest_method": row.get("ingest_method") or "html_llm",
        "endpoint_url": row.get("endpoint_url"),
        "parser_key": row.get("parser_key"),
        "robots_status": row.get("robots_status") or "unknown",
        "robots_checked_at": row.get("robots_checked_at"),
        "clearance": row.get("clearance") or "review_pending",
        "clearance_note": row.get("clearance_note"),
        "crawl_delay_s": row.get("crawl_delay_s") or 5,
        "priority": row.get("priority") or 1,
        "health": row.get("health") or "unknown",
        "capabilities": row.get("all_capabilities") or [],
        "notes": row.get("notes") or [],
    }


def push_sources(rows: List[Dict]) -> Dict[str, str]:
    """Upsert every source — including blocked ones.

    Blocked sources are pushed on purpose: the registry is the audit trail, and the
    `blocked` rows are what stop somebody from re-adding ra.co next week. The trigger
    in the schema makes sure no event can hang off them.
    """
    with _client() as client:
        returned = _upsert(client, "sources", [source_payload(r) for r in rows], on_conflict="key")
    return {r["key"]: r["id"] for r in returned}


# ------------------------------------------------------------------- events ---
def stable_event_id(ev: Dict) -> str:
    """Not every feed gives its events an id — JSON-LD in the wild often has none.

    Falling back to the URL is not enough either: several events can share one page.
    Title + start time is unique per source (the normalizer already deduped on it)
    and stays the same across runs, so upserts keep matching the same row.
    """
    explicit = (ev.get("source_event_id") or "").strip()
    if explicit:
        return explicit
    basis = "%s|%s|%s" % (ev.get("source_key"), (ev.get("title") or "").lower(), (ev.get("starts_at") or "")[:16])
    return "sha1:" + hashlib.sha1(basis.encode("utf-8")).hexdigest()


def event_payload(ev: Dict, source_id: str) -> Dict:
    return {
        "source_id": source_id,
        "source_event_id": stable_event_id(ev),
        "source_url": ev.get("source_url"),
        "title": ev.get("title"),
        # description_ours stays NULL until our own copy is generated.
        # Third-party descriptions are never carried here.
        "starts_at": ev.get("starts_at"),
        "ends_at": ev.get("ends_at"),
        "venue_name": ev.get("venue_name"),
        "address": ev.get("address"),
        "geo": _wkt(ev.get("lat"), ev.get("lng")),
        "price_min": ev.get("price_min"),
        "price_max": ev.get("price_max"),
        "is_free": ev.get("is_free"),
        "ticket_url": ev.get("ticket_url"),
        "category": ev.get("category") or [],
        "lineup": ev.get("lineup") or [],
        "last_seen_at": "now()",
    }


def push_events(events: List[Dict], source_ids: Dict[str, str]) -> int:
    payloads = []
    skipped = 0
    collided = 0
    seen = set()
    for ev in events:
        sid = source_ids.get(ev.get("source_key"))
        if not sid or not ev.get("starts_at") or not ev.get("title") or not ev.get("source_url"):
            skipped += 1
            continue
        p = event_payload(ev, sid)
        p.pop("last_seen_at")  # let the column default handle it
        # Postgres rejects a batch that touches the same conflict target twice.
        key = (p["source_id"], p["source_event_id"])
        if key in seen:
            collided += 1
            continue
        seen.add(key)
        payloads.append(p)
    if collided:
        print("  dropped %d events that collide on (source, event id)" % collided)
    if not payloads:
        return 0
    with _client() as client:
        _upsert(client, "events", payloads, on_conflict="source_id,source_event_id")
    if skipped:
        print("  skipped %d events without source/title/start time" % skipped)
    return len(payloads)
