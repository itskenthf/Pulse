-- Reading widget rework: multiple books can be "in progress" at once,
-- with a real history of finished ones — the original 0007 schema
-- (unique(user_id), one row per user, no history) is superseded.
--
-- `drop constraint if exists` guards against the auto-generated name
-- (Postgres's default for an unnamed inline `unique(...)` is
-- `<table>_<column>_key`) differing from what's assumed here — verify
-- in the Supabase SQL Editor's constraint list if this errors.

alter table reading drop constraint if exists reading_user_id_key;

alter table reading add column if not exists status text not null default 'reading'
  check (status in ('reading', 'finished'));

alter table reading add column if not exists finished_at timestamptz;

create index if not exists reading_user_status_idx
  on reading (user_id, status, updated_at desc);
