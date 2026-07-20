-- Core Pulse schema (reference doc §8).
--
-- User identity lives in the `next_auth` schema, created and owned by the
-- @auth/supabase-adapter (Auth.js). Supabase's own Auth product is not used
-- (see docs/DECISIONS.md) — this migration only adds Pulse's application
-- tables, all keyed off next_auth.users.id.

create extension if not exists pgcrypto;

create table if not exists widget_registry (
  id text primary key,               -- matches Widget.id from the SDK contract
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists user_widgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  widget_id text not null references widget_registry (id) on delete cascade,
  enabled boolean not null default true,
  position integer not null default 0,
  size text not null default 'md',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, widget_id)
);

create table if not exists widget_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  widget_id text not null references widget_registry (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, widget_id)
);

-- One generic cache table for every widget's fetched data (see §5/§8 —
-- avoids a schema migration each time a new widget is added).
create table if not exists widget_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  widget_id text not null references widget_registry (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, widget_id)
);

-- Reserved for the future event bus (§5) — not written to or read from in v1.
create table if not exists widget_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists habit_entries (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits (id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_widgets_user_id_idx on user_widgets (user_id);
create index if not exists widget_settings_user_id_idx on widget_settings (user_id);
create index if not exists widget_cache_user_id_idx on widget_cache (user_id);
create index if not exists focus_sessions_user_id_idx on focus_sessions (user_id);
create index if not exists habits_user_id_idx on habits (user_id);
create index if not exists tasks_user_id_idx on tasks (user_id);
