"""python -m berlinbot.cli <command>

  discover [--limit N]   pull Berlin bar/club candidates from OpenStreetMap
  probe    [--limit N]   check each candidate for a machine-readable feed
  report                 what the registry currently holds
  guard-test             prove the compliance gate refuses blocked sources
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import List

from . import config, policy, registry
from .discovery import overpass, probe


def cmd_discover(args) -> None:
    cands = overpass.fetch_candidates()
    if args.limit:
        cands = cands[: args.limit]
    overpass.save(cands)
    kinds = {}
    for c in cands:
        kinds[c["kind"]] = kinds.get(c["kind"], 0) + 1
    print("saved %d candidates -> %s" % (len(cands), config.CANDIDATES_PATH))
    for k, v in sorted(kinds.items(), key=lambda kv: -kv[1]):
        print("  %-14s %d" % (k, v))


def cmd_probe(args) -> None:
    cands = overpass.load()
    if not cands:
        sys.exit("no candidates — run `discover` first")
    if args.kind:
        cands = [c for c in cands if c["kind"] in args.kind]
    if args.limit:
        cands = cands[: args.limit]
    print("probing %d venues (concurrency %d hosts, %.0fs crawl delay per host)"
          % (len(cands), config.MAX_HOSTS_IN_PARALLEL, config.DEFAULT_CRAWL_DELAY_S))

    # Write as we go: a run over hundreds of venues takes a while and must survive
    # being interrupted. Nothing is buffered until the end.
    known = {r["key"]: r for r in registry.load()}
    log = open(config.PROBE_LOG_PATH, "a", encoding="utf-8")
    state = {"done": 0, "green": 0}

    def on_result(report, cand):
        row = registry.row_from_report(report, cand)
        known[row["key"]] = row
        state["done"] += 1
        if row["clearance"] == "green":
            state["green"] += 1
            print("  [%3d/%d] green: %-30s %-8s %s"
                  % (state["done"], len(cands), row["name"][:30], row["ingest_method"], row["endpoint_url"]))
        log.write(json.dumps(report, ensure_ascii=False) + "\n")
        log.flush()
        if state["done"] % 10 == 0:
            registry.save(list(known.values()))
            print("  [%3d/%d] %d green so far" % (state["done"], len(cands), state["green"]))

    try:
        asyncio.run(probe.probe_all(cands, concurrency=config.MAX_HOSTS_IN_PARALLEL, on_result=on_result))
    except KeyboardInterrupt:
        print("\ninterrupted — keeping the %d venues already probed" % state["done"])
    finally:
        registry.save(list(known.values()))
        log.close()

    merged = list(known.values())
    print("\nregistry -> %s" % config.SOURCES_PATH)
    _print_counts(merged)
    _print_green(merged)


def _print_counts(rows: List[dict]) -> None:
    counts = registry.summarize(rows)
    total = len(rows)
    for k, v in counts.items():
        print("  %-22s %4d  (%4.1f%%)" % (k, v, 100.0 * v / max(total, 1)))
    print("  %-22s %4d" % ("total", total))


def _print_green(rows: List[dict]) -> None:
    greens = registry.green(rows)
    if not greens:
        return
    print("\ngreen sources (%d) — these are the only ones the fetcher may run:" % len(greens))
    for r in sorted(greens, key=lambda r: (r["ingest_method"], r["name"].lower())):
        print("  %-9s %-34s %s" % (r["ingest_method"], r["name"][:34], r["endpoint_url"]))


def cmd_pull(args) -> None:
    """Pull real events from the green sources only."""
    from .fetcher import PoliteFetcher
    from .ingest import adapters

    rows = registry.green()
    if not rows:
        sys.exit("no green sources — run `discover` then `probe` first")
    if args.limit:
        rows = rows[: args.limit]

    async def run():
        out = []
        async with PoliteFetcher() as fetcher:
            for src in rows:
                policy.assert_ingestable(src)  # gate again, right before the request
                events = await adapters.pull(fetcher, src)
                print("  %-34s %-8s %3d events" % (src["name"][:34], src["ingest_method"], len(events)))
                out.extend(events)
        return out

    from .ingest.normalize import normalize

    raw = asyncio.run(run())
    events, dropped = normalize(raw)
    print("\nnormalized %d -> %d events (%s)"
          % (len(raw), len(events), ", ".join("%s %d" % kv for kv in dropped.items() if kv[1])))

    path = config.DATA_DIR / "raw_events.jsonl"
    with open(path, "w", encoding="utf-8") as fh:
        for ev in events:
            fh.write(json.dumps(ev, ensure_ascii=False) + "\n")

    print("%d events from %d sources -> %s" % (len(events), len(rows), path))
    for ev in events[:12]:
        print("  %s  %-28s %s" % (ev["starts_at"][:16], ev["venue_name"][:28], ev["title"][:44]))


def cmd_push(args) -> None:
    """Push the registry and the pulled events into Supabase."""
    from .sink import supabase

    rows = registry.load()
    if not rows:
        sys.exit("registry is empty — run `discover` then `probe` first")

    print("pushing %d sources (%d green, blocked rows included as audit trail)"
          % (len(rows), len(registry.green(rows))))
    source_ids = supabase.push_sources(rows)
    print("  ok, %d source ids returned" % len(source_ids))

    events_path = config.DATA_DIR / "raw_events.jsonl"
    if not events_path.exists():
        print("no raw_events.jsonl yet — run `pull` to fetch events")
        return
    events = [json.loads(line) for line in events_path.read_text("utf-8").splitlines() if line.strip()]
    n = supabase.push_events(events, source_ids)
    print("pushed %d events" % n)


def cmd_clear(args) -> None:
    """Human clearance for html_llm sources. Deliberately manual — see CLAUDE.md."""
    from datetime import datetime, timezone

    rows = registry.load()
    if not rows:
        sys.exit("registry is empty")
    wanted = [n.lower() for n in args.names]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    changed = []

    for r in rows:
        if not any(w in r["name"].lower() for w in wanted):
            continue
        if r["clearance"] == "blocked":
            print("  refused %-28s (blocked: %s)" % (r["name"][:28], r["clearance_note"]))
            continue
        if r.get("robots_status") != "allowed":
            print("  refused %-28s (robots_status=%s)" % (r["name"][:28], r.get("robots_status")))
            continue
        r["clearance"] = "green"
        r["ingest_method"] = "html_llm"
        r["parser_key"] = "html_llm"
        r["endpoint_url"] = r.get("endpoint_url") or (r.get("event_pages") or [r["homepage"]])[0]
        r["clearance_note"] = "html_llm cleared manually on %s (%s)" % (now[:10], args.note or "operator decision")
        changed.append(r)
        print("  cleared %-28s %s" % (r["name"][:28], r["endpoint_url"]))

    if not changed:
        sys.exit("nothing matched — pass parts of the venue names as arguments")
    registry.save(rows)
    print("\n%d sources cleared for html_llm -> %s" % (len(changed), config.SOURCES_PATH))


def cmd_report(args) -> None:
    rows = registry.load()
    if not rows:
        sys.exit("registry is empty — run `discover` then `probe`")
    _print_counts(rows)
    _print_green(rows)
    pending = [r for r in rows if r["clearance"] == "review_pending"]
    print("\nreview_pending: %d (html_llm candidates, need manual clearance)" % len(pending))
    for r in pending[:15]:
        print("  %-34s %s" % (r["name"][:34], r["homepage"]))


def cmd_guard_test(args) -> None:
    print("blocklist covers: %s\n" % ", ".join(policy.blocklist_summary()))
    for url in [
        "https://ra.co/events/de/berlin",
        "https://rausgegangen.de/berlin/",
        "https://lu.ma/berlin",
        "https://dice.fm/browse/berlin",
        "https://www.instagram.com/berghain/",
        "https://www.eventim.de/city/berlin-2/",
    ]:
        try:
            policy.assert_domain_allowed(url)
            print("  FAIL  %s was NOT blocked" % url)
        except policy.BlockedSourceError as exc:
            print("  ok    refused %s" % url)
    fake = {"key": "x", "endpoint_url": "https://example.berlin/events", "clearance": "review_pending", "robots_status": "allowed"}
    try:
        policy.assert_ingestable(fake)
        print("  FAIL  non-green source passed the ingest gate")
    except policy.ClearanceError:
        print("  ok    refused ingest from a source that is not cleared green")


def main() -> None:
    ap = argparse.ArgumentParser(prog="berlinbot")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("discover"); p.add_argument("--limit", type=int); p.set_defaults(fn=cmd_discover)
    p = sub.add_parser("probe")
    p.add_argument("--limit", type=int)
    p.add_argument("--kind", nargs="*", help="e.g. nightclub music_venue bar pub")
    p.set_defaults(fn=cmd_probe)
    p = sub.add_parser("pull"); p.add_argument("--limit", type=int); p.set_defaults(fn=cmd_pull)
    p = sub.add_parser("clear", help="manually clear venues for the html_llm extractor")
    p.add_argument("names", nargs="+", help="substrings of venue names")
    p.add_argument("--note", help="why this was cleared")
    p.set_defaults(fn=cmd_clear)
    p = sub.add_parser("push"); p.set_defaults(fn=cmd_push)
    p = sub.add_parser("report"); p.set_defaults(fn=cmd_report)
    p = sub.add_parser("guard-test"); p.set_defaults(fn=cmd_guard_test)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
