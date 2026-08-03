-- All application data access currently goes exclusively through the
-- server-only service-role client (packages/database/src/client.ts),
-- which bypasses RLS entirely and is unaffected by this migration. The
-- NEXT_PUBLIC_SUPABASE_ANON_KEY plumbing already exists (env, turbo.json,
-- CI) even though no browser-side client uses it yet. Enabling RLS with
-- no policies now means that if one is ever added later, tables are
-- deny-by-default instead of wide open. See docs/DECISIONS.md.

alter table widget_registry enable row level security;
alter table user_widgets enable row level security;
alter table widget_settings enable row level security;
alter table widget_cache enable row level security;
alter table widget_events enable row level security;
alter table focus_sessions enable row level security;
alter table habits enable row level security;
alter table habit_entries enable row level security;
alter table tasks enable row level security;
alter table memories enable row level security;
alter table notes enable row level security;
alter table notebook_entries enable row level security;
