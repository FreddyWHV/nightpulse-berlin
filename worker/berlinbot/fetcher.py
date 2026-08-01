"""The only way this worker is allowed to make an HTTP request.

Every call runs through:
  domain blocklist  ->  robots.txt for this exact path  ->  per-host serialisation
  ->  crawl delay  ->  conditional GET (ETag / Last-Modified)
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import urlparse

import httpx

from . import config, policy


@dataclass
class FetchResult:
    url: str
    status: int
    text: str
    content_type: str
    from_cache: bool = False
    skipped_reason: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.skipped_reason is None and 200 <= self.status < 300

    @property
    def is_json(self) -> bool:
        return "json" in self.content_type

    @property
    def is_html(self) -> bool:
        return "html" in self.content_type or "xml" in self.content_type


class PoliteFetcher:
    def __init__(self, robots: Optional[policy.RobotsCache] = None) -> None:
        self.robots = robots or policy.RobotsCache()
        self._host_locks: Dict[str, asyncio.Lock] = {}
        self._host_last_hit: Dict[str, float] = {}
        self._host_slots = asyncio.Semaphore(config.MAX_HOSTS_IN_PARALLEL)
        self._client = httpx.AsyncClient(
            headers={
                "User-Agent": config.USER_AGENT,
                "Accept-Language": "de,en;q=0.8",
            },
            timeout=config.REQUEST_TIMEOUT_S,
            follow_redirects=True,
        )

    async def __aenter__(self) -> "PoliteFetcher":
        return self

    async def __aexit__(self, *exc) -> None:
        await self._client.aclose()

    # -- conditional GET bookkeeping ---------------------------------------
    def _cache_path(self, url: str):
        return config.CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest()[:24] + ".json")

    def _load_cache(self, url: str) -> Optional[dict]:
        p = self._cache_path(url)
        if p.exists():
            try:
                return json.loads(p.read_text("utf-8"))
            except Exception:
                return None
        return None

    def _store_cache(self, url: str, resp: httpx.Response, text: str) -> None:
        self._cache_path(url).write_text(
            json.dumps(
                {
                    "url": url,
                    "etag": resp.headers.get("etag"),
                    "last_modified": resp.headers.get("last-modified"),
                    "content_type": resp.headers.get("content-type", ""),
                    "status": resp.status_code,
                    "text": text,
                    "stored_at": time.time(),
                }
            ),
            "utf-8",
        )

    # -- the gate ----------------------------------------------------------
    async def get(self, url: str, *, allow_cache: bool = True) -> FetchResult:
        """`allow_cache` also skips revalidation while the cached copy is fresh.

        A conditional GET still costs a round trip *and* the crawl delay, so for a
        re-run over venues we probed hours ago, serving straight from disk is both
        much faster and politer than asking again.
        """
        if allow_cache and config.CACHE_TTL_S > 0:
            cached = self._load_cache(url)
            if cached and (time.time() - cached.get("stored_at", 0)) < config.CACHE_TTL_S:
                return FetchResult(
                    url, cached.get("status", 200), cached.get("text", ""),
                    cached.get("content_type", ""), from_cache=True,
                )

        reason = policy.blocked_reason(url)
        if reason:
            # Not an exception here: discovery walks over lists that may contain
            # links to blocked platforms, and skipping them quietly is correct.
            return FetchResult(url, 0, "", "", skipped_reason="blocked: " + reason)

        verdict = self.robots.check(url)
        if verdict.status != "allowed":
            return FetchResult(url, 0, "", "", skipped_reason="robots: %s (%s)" % (verdict.status, verdict.note))

        host = urlparse(url).netloc
        lock = self._host_locks.setdefault(host, asyncio.Lock())

        async with self._host_slots:
            async with lock:  # concurrency 1 per host
                wait = verdict.crawl_delay - (time.monotonic() - self._host_last_hit.get(host, 0.0))
                if wait > 0:
                    await asyncio.sleep(wait)
                cached = self._load_cache(url) if allow_cache else None
                headers = {}
                if cached:
                    if cached.get("etag"):
                        headers["If-None-Match"] = cached["etag"]
                    if cached.get("last_modified"):
                        headers["If-Modified-Since"] = cached["last_modified"]
                try:
                    resp = await self._client.get(url, headers=headers)
                except Exception as exc:
                    self._host_last_hit[host] = time.monotonic()
                    return FetchResult(url, 0, "", "", skipped_reason="error: %s" % type(exc).__name__)
                self._host_last_hit[host] = time.monotonic()

        if resp.status_code == 304 and cached:
            return FetchResult(url, 200, cached["text"], cached.get("content_type", ""), from_cache=True)

        text = resp.text if len(resp.content) < 4_000_000 else ""
        ctype = resp.headers.get("content-type", "")
        if 200 <= resp.status_code < 300:
            self._store_cache(url, resp, text)
        return FetchResult(str(resp.url), resp.status_code, text, ctype)

    async def get_json(self, url: str) -> Optional[object]:
        res = await self.get(url)
        if not res.ok:
            return None
        try:
            return json.loads(res.text)
        except Exception:
            return None
