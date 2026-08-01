-- Berlin Event Aggregator — initial schema
--
-- Design note: the data policy is enforced *in the database*, not only in the worker.
-- An event row physically cannot be inserted against a source that is not cleared
-- green (see trigger `events_require_green_source` below). That is the answer to
-- "how do you know nobody bypassed the guard".

create extension if not exists "pgcrypto";
create extension if not exists "postgis";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------- sources ---
create type ingest_method as enum ('api', 'ics', 'rss', 'jsonld', 'wp_rest', 'html_llm', 'manual');
create type clearance_level as enum ('green', 'review_pending', 'blocked');
create type robots_state as enum ('allowed', 'disallowed', 'partial', 'unknown', 'n/a');

create table public.sources (
  id                uuid primary key default gen_random_uuid(),
  key               text not null unique,
  name              text not null,
  homepage          text,
  type              text not null default 'venue',      -- venue | club | api | open_data
  city              text not null default 'Berlin',
  district          text,
  geo               geography(point, 4326),
  address           text,
  osm_id            text,

  ingest_method     ingest_method not null,
  endpoint_url      text,
  parser_key        text,
  parser_config     jsonb not null default '{}'::jsonb,

  robots_status     robots_state not null default 'unknown',
  robots_checked_at timestamptz,
  clearance         clearance_level not null default 'review_pending',
  clearance_note    text,
  tos_url           text,

  crawl_delay_s     numeric not null default 5,
  priority          int not null default 1,             -- 1 = venue's own site, wins merges
  last_crawl_at     timestamptz,
  next_crawl_at     timestamptz,
  health            text not null default 'unknown',    -- ok | degraded | broken | unknown
  events_last_run   int,
  error_last_run    text,

  capabilities      jsonb not null default '[]'::jsonb, -- every feed we found, not just the chosen one
  notes             jsonb not null default '[]'::jsonb,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.sources.clearance is
  'Only `green` is runnable. `review_pending` needs a human decision; html_llm sources never auto-clear.';

create index sources_clearance_idx on public.sources (clearance);
create index sources_geo_idx on public.sources using gist (geo);

-- A source is only runnable when BOTH gates passed.
create or replace function public.source_is_runnable(s public.sources)
returns boolean language sql immutable as $$
  select s.clearance = 'green' and s.robots_status in ('allowed', 'n/a')
$$;

-- ----------------------------------------------------------------- events ---
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references public.sources(id) on delete cascade,
  source_event_id   text,
  source_url        text not null,                      -- we always link back
  canonical_id      uuid,                               -- set by dedup; groups duplicates

  title             text not null,
  description_ours  text,                               -- OUR copy. Never a third-party text.

  starts_at         timestamptz not null,
  ends_at           timestamptz,
  doors_at          timestamptz,

  venue_name        text,
  address           text,
  geo               geography(point, 4326),

  price_min         numeric,
  price_max         numeric,
  is_free           boolean,
  ticket_url        text,

  category          text[] not null default '{}',
  vibe_tags         text[] not null default '{}',
  lineup            text[] not null default '{}',

  image_url         text,                               -- only our own / explicitly licensed
  image_source      text,
  embedding         vector(1536),

  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  status            text not null default 'active',     -- active | cancelled | stale
  raw               jsonb not null default '{}'::jsonb,

  unique (source_id, source_event_id)
);

create index events_starts_at_idx on public.events (starts_at) where status = 'active';
create index events_geo_idx on public.events using gist (geo);
create index events_canonical_idx on public.events (canonical_id);
create index events_title_trgm_idx on public.events using gin (title gin_trgm_ops);
-- ivfflat builds its clusters from the rows present at creation time. Created empty
-- here so the schema is complete; REINDEX it once a few thousand events are loaded.
create index events_embedding_idx on public.events
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- The compliance guard, in the database.
create or replace function public.assert_green_source()
returns trigger language plpgsql as $$
declare
  s public.sources;
begin
  select * into s from public.sources where id = new.source_id;
  if not found then
    raise exception 'unknown source_id %', new.source_id;
  end if;
  if not public.source_is_runnable(s) then
    raise exception
      'refusing event from source % (%): clearance=%, robots_status=% — only green+allowed may be ingested',
      s.key, s.name, s.clearance, s.robots_status;
  end if;
  return new;
end;
$$;

create trigger events_require_green_source
  before insert or update of source_id on public.events
  for each row execute function public.assert_green_source();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger sources_touch_updated_at
  before update on public.sources
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------- what the app reads ---
-- The app never touches the base tables. It reads these two views, which are also
-- the place where the "facts only, our own copy" rule is made visible.
create view public.app_events
with (security_invoker = off) as
  select
    e.id,
    e.canonical_id,
    e.title,
    e.description_ours              as description,
    e.starts_at,
    e.ends_at,
    e.doors_at,
    coalesce(e.venue_name, s.name)  as venue_name,
    e.address,
    st_y(e.geo::geometry)           as lat,
    st_x(e.geo::geometry)           as lng,
    s.district,
    e.price_min,
    e.price_max,
    e.is_free,
    e.ticket_url,
    e.source_url,
    s.name                          as source_name,
    s.type                          as source_type,
    e.category,
    e.vibe_tags,
    e.lineup,
    e.image_url
  from public.events e
  join public.sources s on s.id = e.source_id
  where e.status = 'active'
    and public.source_is_runnable(s)
    and e.starts_at >= now() - interval '4 hours';

create view public.app_venues
with (security_invoker = off) as
  select
    s.id, s.key, s.name, s.homepage, s.type, s.district,
    st_y(s.geo::geometry) as lat,
    st_x(s.geo::geometry) as lng,
    s.address,
    (select count(*) from public.events e
      where e.source_id = s.id and e.status = 'active' and e.starts_at >= now()) as upcoming_events
  from public.sources s
  where public.source_is_runnable(s);

-- Geo + time query for the app, as one RPC call.
create or replace function public.events_near(
  in_lat        double precision,
  in_lng        double precision,
  radius_m      double precision default 5000,
  from_ts       timestamptz default now(),
  to_ts         timestamptz default now() + interval '7 days',
  max_price     numeric default null,
  result_limit  int default 100
)
returns setof public.app_events
language sql stable as $$
  select *
  from public.app_events v
  where v.starts_at between from_ts and to_ts
    and (max_price is null or v.price_min is null or v.price_min <= max_price)
    and (
      v.lat is null
      or st_dwithin(
           st_setsrid(st_makepoint(v.lng, v.lat), 4326)::geography,
           st_setsrid(st_makepoint(in_lng, in_lat), 4326)::geography,
           radius_m)
    )
  order by v.starts_at
  limit result_limit;
$$;

-- --------------------------------------------------------------------- RLS ---
-- Base tables: locked. The anon key the app ships with cannot read them.
alter table public.sources enable row level security;
alter table public.events  enable row level security;

revoke all on public.sources from anon, authenticated;
revoke all on public.events  from anon, authenticated;

-- Views run as owner (security_invoker = off), so they are the only way in.
grant select on public.app_events, public.app_venues to anon, authenticated;
grant execute on function public.events_near(
  double precision, double precision, double precision,
  timestamptz, timestamptz, numeric, int
) to anon, authenticated;

-- The worker uses the service_role key, which bypasses RLS by design.
