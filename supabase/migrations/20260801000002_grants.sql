-- Privileges.
--
-- When the initial migration is applied by the CLI/migration role rather than by
-- `postgres`, Supabase's default privileges do not fire, and service_role ends up
-- without table rights. This makes the grants explicit.
--
-- Roles:
--   service_role  — the worker. Full access, bypasses RLS by design.
--   anon          — the app. Views and the RPC only, never the base tables.

grant usage on schema public to anon, authenticated, service_role;

-- Worker: writes everything.
grant select, insert, update, delete on public.sources to service_role;
grant select, insert, update, delete on public.events  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- App: read-only, and only through the views.
revoke all on public.sources from anon, authenticated;
revoke all on public.events  from anon, authenticated;
grant select on public.app_events, public.app_venues to anon, authenticated, service_role;
grant execute on function public.events_near(
  double precision, double precision, double precision,
  timestamptz, timestamptz, numeric, int
) to anon, authenticated, service_role;

-- Same treatment for anything added later in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
