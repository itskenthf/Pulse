-- Reading widget: one row per user tracking the current book (no
-- history — starting a new book overwrites the existing row).
-- `unique(user_id)` enforces the one-row-per-user invariant at the DB
-- level so writes can upsert directly instead of an app-level
-- check-then-write race.
--
-- service_role grants come for free via 0002's `alter default
-- privileges`, no separate grant needed for this table.

create table if not exists reading (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  title text not null,
  author text not null default '',
  current_page integer not null default 0,
  total_page integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table reading enable row level security;
