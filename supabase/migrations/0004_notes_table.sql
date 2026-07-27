-- Notes widget. `tasks` already exists from 0001_core_schema.sql — this
-- migration only adds the table that was missing.
--
-- service_role grants come for free via 0002's `alter default privileges`,
-- no separate grant needed for this table.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx
  on notes (user_id, created_at desc);
