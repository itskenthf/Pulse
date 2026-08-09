-- Body & Health pillar, Phase 1 (docs/DECISIONS.md's Body & Health entry).
--
-- service_role grants come for free via 0002's `alter default privileges`,
-- no separate grant needed for these tables.

create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  weight_kg numeric(5,2) not null check (weight_kg > 0),
  logged_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No unique constraint: every weigh-in is its own row, not a single
-- upsert-able one — same lesson 0008 already learned moving Reading away
-- from a rigid one-row invariant. "One entry per week" is a UI convention
-- (latest entry per ISO week wins for the trend/current-weight stat), not
-- a DB rule, so correcting a mis-logged weight is a plain insert/delete.
create index if not exists weight_logs_user_logged_on_idx
  on weight_logs (user_id, logged_on desc);

alter table weight_logs enable row level security;

-- One row per day, not one row per tap: no per-tap history UI is planned,
-- and daily totals are the natural granularity for nutrition insights.
-- One-tap "+" buttons upsert with `field = field + $1`, race-safe via
-- Postgres's own row lock on the (user_id, logged_on) conflict target.
create table if not exists nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  logged_on date not null,
  calories integer not null default 0 check (calories >= 0),
  protein_g integer not null default 0 check (protein_g >= 0),
  water_ml integer not null default 0 check (water_ml >= 0),
  milk_ml integer not null default 0 check (milk_ml >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create index if not exists nutrition_logs_user_logged_on_idx
  on nutrition_logs (user_id, logged_on desc);

alter table nutrition_logs enable row level security;

create table if not exists meal_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  logged_on date not null,
  breakfast boolean not null default false,
  lunch boolean not null default false,
  dinner boolean not null default false,
  snack boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create index if not exists meal_checks_user_logged_on_idx
  on meal_checks (user_id, logged_on desc);

alter table meal_checks enable row level security;

-- A single generic table rather than one per goal shape — covers a
-- target-value goal ("Reach 45kg": metric=weight_kg, comparator=at_most,
-- cadence=once), a daily-habit goal ("Drink milk daily": metric=milk_ml,
-- comparator=at_least, cadence=daily), and a frequency goal ("Workout 3x/
-- week", Phase 2: metric=workout_count, comparator=at_least, cadence=
-- weekly) uniformly. Whether a goal is currently met is computed by
-- reading the relevant log table, not stored redundantly here.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  title text not null,
  metric text not null
    check (metric in ('weight_kg', 'calories', 'protein_g', 'water_ml', 'milk_ml', 'workout_count')),
  comparator text not null default 'at_least'
    check (comparator in ('at_least', 'at_most', 'exactly')),
  target_value numeric not null,
  cadence text not null default 'once'
    check (cadence in ('once', 'daily', 'weekly')),
  active boolean not null default true,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_active_idx on goals (user_id, active);

alter table goals enable row level security;

-- Phase 2 (not built yet — see docs/DECISIONS.md's Body & Health entry):
--
-- progress_photos: id, user_id, storage_path (text — Supabase Storage
--   object key, e.g. "body-health/<user_id>/<uuid>.jpg"; no bucket exists
--   yet), taken_on (date), note (text), created_at. This is the first
--   consumer of Supabase Storage in this repo — bucket creation +
--   signed-URL read pattern is new infra, deliberately deferred.
--
-- workouts: id, user_id, performed_on (date), type (text), duration_min
--   (integer), note (text), created_at. Feeds the 'workout_count' goal
--   metric already reserved in `goals.metric`'s check constraint above.
--
-- weekly_reviews: id, user_id, week_of (date), reflection (text),
--   created_at, updated_at. unique(user_id, week_of).
--
-- insights: no dedicated table — Phase 2 Insights reads across
-- weight_logs/nutrition_logs/meal_checks/workouts directly, not a
-- materialized table.
