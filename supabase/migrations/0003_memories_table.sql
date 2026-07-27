-- Memory/Timeline feature, Milestone 1 (docs/MEMORY_ROADMAP.md). A
-- separate table from the existing `widget_events` — that one is reserved
-- for a different, still-undesigned feature (a pub/sub event bus for
-- cross-widget reactions, §5/§20) and deliberately left alone here. See
-- docs/DECISIONS.md for the reasoning.
--
-- service_role grants come for free via 0002's `alter default privileges`,
-- no separate grant needed for this table.

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  source text not null,           -- widget id ("github", "spotify", "steam")
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memories_user_created_idx
  on memories (user_id, created_at desc);
