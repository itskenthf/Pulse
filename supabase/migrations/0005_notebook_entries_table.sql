-- Notebook widget. A freeform, untitled entry stream — distinct from
-- `notes` (titled, editable, delete-able). No edit/delete of closed
-- entries in v1; only the still-open "draft" (tracked client-side, not
-- in the schema) gets updated in place before the box is cleared.
--
-- service_role grants come for free via 0002's `alter default privileges`,
-- no separate grant needed for this table.

create table if not exists notebook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references next_auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notebook_entries_user_created_idx
  on notebook_entries (user_id, created_at desc);
