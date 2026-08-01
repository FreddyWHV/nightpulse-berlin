"""Compliance gate.

Two separate gates, both mandatory:

1. ``assert_domain_allowed`` — hard blocklist from ``docs/sources-allowlist.json``.
   Covers the § 87b UrhG (sui-generis database right) risk: aggregators whose event
   database we must not extract, regardless of what their robots.txt says.
2. ``Robots`` — robots.txt for the concrete path, per our own user agent.

Nothing in this package may issue an HTTP request without passing through
``fetcher.PoliteFetcher``, which calls both gates. There is no bypass flag, and
none is to be added — not even temporarily for a demo (see CLAUDE.md).
"""

from __future__ import annotations

import json
import time
import urllib.robotparser
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

from . import config


class BlockedSourceError(RuntimeError):
    """Raised when code tries to touch a domain on the blocklist."""


class ClearanceError(RuntimeError):
    """Raised when code tries to ingest from a source that is not cleared green."""


def _load_allowlist() -> dict:
    with open(config.ALLOWLIST_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


ALLOWLIST = _load_allowlist()


def _blocked_domains() -> Dict[str, str]:
    """domain -> reason, expanded from the comma-separated ``domain`` fields."""
    out: Dict[str, str] = {}
    for entry in ALLOWLIST.get("blocked", []):
        for dom in str(entry.get("domain", "")).split(","):
            dom = dom.strip().lower().lstrip(".")
            if dom:
                out[dom] = entry.get("reason", "on blocklist")
    return out


BLOCKED_DOMAINS = _blocked_domains()

# Aggregators/platforms that must never be ingested even if someone forgets to add
# them to the JSON blocklist. Belt and braces; the JSON file stays the source of truth.
HARD_BLOCK_SUFFIXES = (
    "ra.co",
    "residentadvisor.net",
    "rausgegangen.de",
    "luma.com",
    "lu.ma",
    "dice.fm",
    "eventim.de",
    "eventbrite.com",
    "eventbrite.de",
    "instagram.com",
    "facebook.com",
    "fb.com",
    "meetup.com",
    "songkick.com",
    "bandsintown.com",
)


def host_of(url: str) -> str:
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def _matches(host: str, domain: str) -> bool:
    return host == domain or host.endswith("." + domain)


def blocked_reason(url: str) -> Optional[str]:
    host = (urlparse(url).hostname or "").lower()
    if not host:
        return "no host in url"
    for dom, reason in BLOCKED_DOMAINS.items():
        if _matches(host, dom):
            return reason
    for dom in HARD_BLOCK_SUFFIXES:
        if _matches(host, dom):
            return "hard-coded blocklist (aggregator / platform ToS / § 87b UrhG)"
    return None


def assert_domain_allowed(url: str) -> None:
    reason = blocked_reason(url)
    if reason:
        raise BlockedSourceError(f"{url} is blocked: {reason}")


def assert_ingestable(source: dict) -> None:
    """Gate for the *ingest* path. Discovery/probing uses the robots gate only."""
    assert_domain_allowed(source.get("endpoint_url") or source.get("homepage") or "")
    if source.get("clearance") != "green":
        raise ClearanceError(
            "refusing to ingest %r: clearance=%r (only 'green' is runnable)"
            % (source.get("key"), source.get("clearance"))
        )
    if source.get("robots_status") not in ("allowed", "n/a"):
        raise ClearanceError(
            "refusing to ingest %r: robots_status=%r"
            % (source.get("key"), source.get("robots_status"))
        )


@dataclass
class RobotsVerdict:
    status: str  # allowed | disallowed | unknown
    crawl_delay: float
    fetched: bool
    note: str = ""


@dataclass
class RobotsCache:
    """One robots.txt per host, fetched once per run.

    Failure policy: 4xx (no robots.txt) means everything is allowed, which is what
    the standard says. A 5xx or a network error means we do *not* know, and we treat
    unknown as disallowed — we would rather miss a venue than crawl uninvited.
    """

    user_agent: str = config.USER_AGENT
    _cache: Dict[str, RobotsVerdict] = field(default_factory=dict)
    _parsers: Dict[str, urllib.robotparser.RobotFileParser] = field(default_factory=dict)

    def _load(self, origin: str) -> RobotsVerdict:
        if origin in self._cache:
            return self._cache[origin]
        rp = urllib.robotparser.RobotFileParser()
        verdict = RobotsVerdict(status="unknown", crawl_delay=config.DEFAULT_CRAWL_DELAY_S, fetched=False)
        try:
            resp = httpx.get(
                origin + "/robots.txt",
                headers={"User-Agent": self.user_agent},
                timeout=config.REQUEST_TIMEOUT_S,
                follow_redirects=True,
            )
            if resp.status_code >= 500:
                verdict.note = "robots.txt %s -> treating host as disallowed" % resp.status_code
            elif resp.status_code >= 400:
                rp.parse([])
                verdict = RobotsVerdict("allowed", config.DEFAULT_CRAWL_DELAY_S, True, "no robots.txt (%s)" % resp.status_code)
            else:
                rp.parse(resp.text.splitlines())
                delay = rp.crawl_delay(self.user_agent) or rp.crawl_delay("*")
                verdict = RobotsVerdict(
                    "allowed",
                    max(float(delay or 0), config.DEFAULT_CRAWL_DELAY_S),
                    True,
                    "robots.txt parsed",
                )
                self._parsers[origin] = rp
        except Exception as exc:  # network error, TLS error, ...
            verdict.note = "robots.txt unreachable (%s) -> treating host as disallowed" % type(exc).__name__
        self._cache[origin] = verdict
        return verdict

    def check(self, url: str) -> RobotsVerdict:
        parts = urlparse(url)
        origin = "%s://%s" % (parts.scheme, parts.netloc)
        verdict = self._load(origin)
        if verdict.status != "allowed":
            return verdict
        rp = self._parsers.get(origin)
        if rp is not None and not rp.can_fetch(self.user_agent, url):
            return RobotsVerdict("disallowed", verdict.crawl_delay, True, "path disallowed by robots.txt")
        return verdict


def blocklist_summary() -> List[str]:
    return sorted(BLOCKED_DOMAINS) + [d for d in HARD_BLOCK_SUFFIXES if d not in BLOCKED_DOMAINS]


if __name__ == "__main__":  # tiny smoke check
    for u in ("https://ra.co/events/de/berlin", "https://www.berghain.berlin/de/", "https://lu.ma/berlin"):
        t0 = time.time()
        print(u, "->", blocked_reason(u) or "not blocked", "(%.0fms)" % ((time.time() - t0) * 1000))
