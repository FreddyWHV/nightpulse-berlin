from __future__ import annotations

import os
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = WORKER_DIR.parent
DOCS_DIR = PROJECT_DIR / "docs"
DATA_DIR = WORKER_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"

ALLOWLIST_PATH = DOCS_DIR / "sources-allowlist.json"
CANDIDATES_PATH = DATA_DIR / "candidates.json"
SOURCES_PATH = DATA_DIR / "sources.json"
PROBE_LOG_PATH = DATA_DIR / "probe-log.jsonl"

# Identify ourselves. Overridable so the real contact can be set without a code change.
def _load_dotenv() -> None:
    """Minimal .env support so secrets stay out of the shell history and the repo."""
    path = WORKER_DIR / ".env"
    if not path.exists():
        return
    for line in path.read_text("utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


_load_dotenv()

USER_AGENT = os.environ.get(
    "BERLINBOT_UA",
    "BerlinEventsBot/0.1 (+https://example.de/bot; contact@example.de)",
)

DEFAULT_CRAWL_DELAY_S = float(os.environ.get("BERLINBOT_CRAWL_DELAY", "5"))
# Concurrency is per *host* = 1 (enforced by a per-host lock). This is the number of
# distinct hosts we talk to at the same time.
MAX_HOSTS_IN_PARALLEL = int(os.environ.get("BERLINBOT_HOST_PARALLELISM", "8"))
REQUEST_TIMEOUT_S = float(os.environ.get("BERLINBOT_TIMEOUT", "20"))
# Serve a cached response without revalidating while it is this fresh. 0 disables.
CACHE_TTL_S = float(os.environ.get("BERLINBOT_CACHE_TTL", str(24 * 3600)))

OVERPASS_URL = os.environ.get("BERLINBOT_OVERPASS", "https://overpass-api.de/api/interpreter")
# OSM relation 62422 = Berlin (admin_level 4). Area id = 3600000000 + relation id.
BERLIN_AREA_ID = 3600062422

for _d in (DATA_DIR, CACHE_DIR):
    _d.mkdir(parents=True, exist_ok=True)
