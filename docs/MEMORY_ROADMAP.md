# Memory / Timeline roadmap

Tracks the Memory/Timeline feature specifically — deliberately **not**
using `docs/ROADMAP.md`'s Phase 0-4 numbering, since that tracks Pulse's
own unrelated macro roadmap and reusing "Phase 1/2/3/4" here would
collide with it. Milestones below are labeled M1-M4 instead.

## Origin

The original pitch (2026-07-27, see `docs/DECISIONS.md`): instead of widgets
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

## M1 — Event log + Timeline page (shipped)

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
- **Full coverage of every write-back-capable widget** (as of
  2026-08-17, see docs/DECISIONS.md's matching entry): GitHub (new repos,
  PRs opened, PRs merged — see docs/DECISIONS.md's 2026-08-02 entry; a
  commit-count signal was considered but dropped, also per
  DECISIONS.md), Steam (new games, meaningful playtime sessions),
  Tasks/Notes/Notebook (new items), Weight (goal reached), Meals (a meal
  checked off, guarded against firing on a day rollover), Weekly Review
  (first save of the week, not every re-save), Reading (a book added or
  finished). Spotify emitted top-artist-change events too until it was
  removed entirely 2026-08-12 — see docs/DECISIONS.md. Hero/Insights/RSS
  deliberately have no `deriveMemories` — greeting/weather/quote,
  computed-on-read insights, and external RSS items aren't
  user-authored/memory-worthy in the same sense.
- Timeline page (`apps/web/src/app/timeline/page.tsx`), grouped Today /
  Yesterday / Last Week / by month, linked from the profile menu.

**Not in M1:** daily/weekly summaries, embeddings, semantic search, any
AI assistant. Adding a new widget after M1 ships means adding its own
`deriveMemories` — no other plumbing changes.

## M2 — Daily / weekly summaries (shipped, then removed)

Shipped as **Daily Digest** (`packages/widgets/daily-digest`) — a
dashboard card reading M1's `memories` table directly (no new table),
grouped by source, computed on read at fetch time (no scheduled job).
**Removed entirely 2026-08-13 by explicit request** — see
`docs/DECISIONS.md`'s matching-dated entry. M2 is back to not-built;
revisiting it is a real option, not ruled out, just not active.

**Scoped down from the original pitch**, by explicit request: the
illustrative "listened to Spotify for 2 hours" implies structured
duration data that doesn't exist — session lengths currently live in
free-text `description` strings (e.g. Steam's "1.5h this session"), not
parseable numeric metadata. Building a true quantified summary would
mean widening every widget's `deriveMemories` to emit structured
metadata (minutes, counts) — a cross-cutting SDK change touching
GitHub/Steam/Spotify/Tasks/Notes/Notebook/Reading, not just a new
widget. Deferred; what shipped instead is a simple counts + title-list
digest ("GitHub (3): Opened PR #42, Merged PR #40 +1 more"), built
entirely from data M1 already produces.

Daily cadence only (not weekly) — see `docs/DECISIONS.md`'s entry for
the reasoning. A weekly variant, or the richer quantified version, are
both real follow-ups if the simple version doesn't hold up in daily
use — not ruled out, just not built ahead of need.

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
