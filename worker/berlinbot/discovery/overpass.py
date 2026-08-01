"""Candidate discovery: Berlin bars, clubs and music venues from OpenStreetMap.

OSM is the candidate list, not an event source. It gives us name, geo, district and
— crucially — the venue's *own* website, which is the thing we then probe for a
machine-readable feed. ODbL, no aggregator involved.
"""

from __future__ import annotations

import json
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse, urlunparse

import httpx

from .. import config, policy

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.osm.jp/api/interpreter",
]

# amenity/leisure tags that map to "Bar oder Club" for our first slice.
OVERPASS_QUERY = """
[out:json][timeout:180];
area(%(area)d)->.berlin;
(
  nwr["amenity"="nightclub"](area.berlin);
  nwr["amenity"="bar"](area.berlin);
  nwr["amenity"="pub"](area.berlin);
  nwr["amenity"="music_venue"](area.berlin);
  nwr["club"="music"](area.berlin);
);
out center tags;
""" % {"area": config.BERLIN_AREA_ID}


def _clean_website(raw: str) -> Optional[str]:
    if not raw:
        return None
    url = raw.strip().split(";")[0].strip()
    if not url:
        return None
    if not re.match(r"^https?://", url, re.I):
        url = "https://" + url.lstrip("/")
    parts = urlparse(url)
    if not parts.hostname or "." not in parts.hostname:
        return None
    # normalise: drop query/fragment, keep path (some venues live under /berlin)
    return urlunparse((parts.scheme, parts.netloc, parts.path.rstrip("/"), "", "", ""))


def _origin(url: str) -> str:
    p = urlparse(url)
    return "%s://%s" % (p.scheme, p.netloc)


def _query_overpass() -> List[Dict]:
    """Overpass instances are frequently overloaded; try the mirrors in turn."""
    last_error = None
    for url in [config.OVERPASS_URL] + [m for m in OVERPASS_MIRRORS if m != config.OVERPASS_URL]:
        try:
            resp = httpx.post(
                url,
                data={"data": OVERPASS_QUERY},
                headers={"User-Agent": config.USER_AGENT},
                timeout=300,
            )
            resp.raise_for_status()
            return resp.json().get("elements", [])
        except Exception as exc:
            last_error = exc
            print("overpass mirror %s failed (%s), trying next" % (url, type(exc).__name__))
    raise RuntimeError("all Overpass mirrors failed: %s" % last_error)


def fetch_candidates() -> List[Dict]:
    elements = _query_overpass()

    by_origin: Dict[str, Dict] = {}
    no_website = 0
    blocked_only = 0

    for el in elements:
        tags = el.get("tags", {})
        name = (tags.get("name") or "").strip()
        if not name:
            continue
        website = _clean_website(tags.get("website") or tags.get("contact:website") or "")
        if not website:
            # Venues that only have an Instagram page are a real slice of Berlin
            # nightlife, but that road is opt-in integration, never scraping.
            no_website += 1
            continue
        if policy.blocked_reason(website):
            blocked_only += 1
            continue

        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        origin = _origin(website)
        cand = {
            "name": name,
            "osm_id": "%s/%s" % (el.get("type"), el.get("id")),
            "kind": tags.get("amenity") or ("music_venue" if tags.get("club") == "music" else "venue"),
            "website": website,
            "origin": origin,
            "lat": lat,
            "lng": lon,
            "district": tags.get("addr:suburb") or tags.get("addr:city_district"),
            "street": " ".join(x for x in (tags.get("addr:street"), tags.get("addr:housenumber")) if x) or None,
            "postcode": tags.get("addr:postcode"),
        }
        prev = by_origin.get(origin)
        # One website can carry several OSM nodes (bar + club at one address).
        # Keep the nightclub/music_venue reading, it is the more useful one for us.
        rank = {"nightclub": 0, "music_venue": 1, "club": 1, "bar": 2, "pub": 3}
        if prev is None or rank.get(cand["kind"], 9) < rank.get(prev["kind"], 9):
            if prev:
                cand["also_osm"] = (prev.get("also_osm") or []) + [prev["osm_id"]]
            by_origin[origin] = cand
        else:
            prev.setdefault("also_osm", []).append(cand["osm_id"])

    out = sorted(by_origin.values(), key=lambda c: (c["kind"], c["name"].lower()))
    print(
        "overpass: %d elements -> %d candidates with own website "
        "(%d without website, %d only on a blocked platform)"
        % (len(elements), len(out), no_website, blocked_only)
    )
    return out


def save(candidates: List[Dict]) -> None:
    config.CANDIDATES_PATH.write_text(
        json.dumps({"source": "openstreetmap/overpass", "license": "ODbL", "candidates": candidates}, indent=2, ensure_ascii=False),
        "utf-8",
    )


def load() -> List[Dict]:
    if not config.CANDIDATES_PATH.exists():
        return []
    return json.loads(config.CANDIDATES_PATH.read_text("utf-8"))["candidates"]
