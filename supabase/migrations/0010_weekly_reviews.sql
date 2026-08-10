-- Weekly Review (Body & Health, Phase 2 partial — Progress Photos/Workout
-- excluded by explicit request; see docs/DECISIONS.md's entry on this).
--
-- No `weight_kg` column: that week's weigh-in is already in `weight_logs`
-- (0009) — reading it there instead of duplicating it avoids two sources
-- of truth for the same number. No `summary` column either: the weekly
-- summary is generated on read from this row (+ that week's weight
-- trend), same "compute on read, don't store a derived value" pattern
-- `goals`'s met/not-met status already uses.
--
-- service_role grants come for free via 0002's `alter default privileges`,
-- no separate grant needed for this table.

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  week_of date not null,
  biggest_achievement text,
  biggest_struggle text,
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  confidence smallint check (confidence between 1 and 5),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_of)
);

create index if not exists weekly_reviews_user_week_idx
  on weekly_reviews (user_id, week_of desc);

alter table weekly_reviews enable row level security;
