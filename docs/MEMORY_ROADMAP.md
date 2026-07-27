# Memory / Timeline roadmap

Tracks the Memory/Timeline feature specifically — deliberately **not**
using `docs/ROADMAP.md`'s Phase 0-4 numbering, since that tracks Pulse's
own unrelated macro roadmap and reusing "Phase 1/2/3/4" here would
collide with it. Milestones below are labeled M1-M4 instead.

## Origin

Ken's pitch (2026-07-27, see `docs/DECISIONS.md`): instead of widgets
only ever showing *current* state, meaningful changes get logged as
small events, which power a chronological Timeline now and, much later,
retrieval for an "Ask Pulse" AI assistant. The core principle: **build
the memory log first, build the assistant last** — retrieval-before-LLM,
not a chatbot with no context to draw on. Each milestone below should be
usable and useful on its own before the next one starts; none of this
should be built ahead of the milestone actually being worked on.

This is a distinct concept from the schema's reserved `widget_events`
table (`docs/PROJECT_REFERENCE.md` §5/§20/§8), which is for a different,
still-undesigned feature — a pub/sub event bus for cross-widget
reactions (e.g. starting a focus session pausing Spotify), deferred
until 2-3 widgets need it. Memory events live in their own `memories`
table. See the 2026-07-27 DECISIONS.md entry for the full reasoning.

## M1 — Event log + Timeline page (in progress / this pass)

- `memories` table (`supabase/migrations/0003_memories_table.sql`):
  id, user_id, source, title, description, metadata (jsonb), created_at.
- `Widget.deriveMemories?(previous, next): MemoryEvent[]` — optional SDK
  hook (`packages/sdk/src/widget.ts`), a pure diff against the previous
  cached snapshot. Diffing (not logging every fetch) is what keeps the
  table from flooding with near-duplicate rows every cron tick, and
  makes generation naturally idempotent.
- Wired into `refreshWidget` (`apps/web/src/lib/refresh-widget.ts`) — the
  single choke point already shared by cron, manual refresh, and
  settings-save, so every refresh path gets memory generation for free.
- Initial coverage: GitHub (new commits, new repos), Spotify (top artist
  changes), Steam (new games, meaningful playtime sessions). Hero
  deliberately has no `deriveMemories` — greeting/weather/quote aren't
  memory-worthy content.
- Timeline page (`apps/web/src/app/timeline/page.tsx`), grouped Today /
  Yesterday / Last Week / by month, linked from the profile menu.

**Not in M1:** daily/weekly summaries, embeddings, semantic search, any
AI assistant. Adding a new widget after M1 ships means adding its own
`deriveMemories` — no other plumbing changes.

## M2 — Daily / weekly summaries

Generate a rollup from M1's raw events — e.g. "Today you made 5 commits,
listened to Spotify for 2 hours, and played Palworld." Exact mechanism
(scheduled job vs. computed on read) to be decided when this milestone
starts, informed by how M1's event volume actually looks in practice.

## M3 — Embeddings + semantic search

Make the event log searchable by meaning, not just keywords/date
ranges. Only worth doing once M1/M2 have real data to search — no
vectors or RAG infrastructure before there's something to retrieve.

## M4 — "Ask Pulse" assistant

Retrieval-before-LLM: a question finds relevant memories first, *then*
sends only those (not the whole log) to Claude/an LLM. The literal last
milestone, not the first — this is deliberately sequenced after M1-M3 so
the assistant has real context to work with instead of being a generic
chatbot bolted onto an empty database.
