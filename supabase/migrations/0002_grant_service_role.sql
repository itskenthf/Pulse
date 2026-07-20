-- Tables created via raw SQL (SQL Editor) don't automatically get the
-- grants Supabase's Table Editor UI applies for you — service_role had no
-- explicit access to any public-schema table, causing "permission denied
-- for table X" even though service_role is meant to bypass RLS entirely.
-- See docs/DECISIONS.md.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

-- Also cover tables created after this migration runs.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;
