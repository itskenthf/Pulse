# Pulse — Personal Command Center Project Reference

This is the source-of-truth document for Pulse: philosophy, architecture,
roadmap, and technical decisions. Other docs in this folder (`ARCHITECTURE.md`,
`ROADMAP.md`, `DESIGN_SYSTEM.md`, `DECISIONS.md`) elaborate on specific parts
of this document as the project evolves; if they ever conflict, this document
wins unless `DECISIONS.md` records an explicit, reasoned change.

## Core philosophy

Pulse is not a dashboard. Pulse is a platform that renders independent
widgets. The dashboard shell should know nothing about calendars, emails,
GitHub, Spotify, or any future integrations. Adding a new widget should
require creating a new widget module and registering it, without modifying
the dashboard shell.

Architecture should always prioritize simplicity, maintainability, and
extensibility over feature count. This philosophy governs every design and
implementation decision below.

## 1. Concept

A personal "life OS" dashboard that aggregates the daily tools and info Ken
checks every morning into one screen, available on desktop, mobile, and
browser, with live/near-live data on every device.

**Core idea:** the app shell knows nothing about calendars or GitHub or
Spotify — it only knows how to render "widgets." Each data source (calendar,
email, GitHub, etc.) is a self-contained widget plugged into the shell. This
keeps it maintainable as more widgets get added over time, and keeps the door
open to publishing it for other users later without a rewrite.

**Naming note:** "Pulse" is taken by several existing apps in this exact
space (task/dashboard apps, habit trackers, enterprise BI tools). Fine as the
personal/working name — revisit if this ever moves toward public release
(app store listing, domain, trademark collisions are likely under this name).

## 2. Target platforms

- Desktop (Windows, work + personal machine)
- Mobile (phone, daily glance use)
- Browser (any device, fallback access)
- Decision: build once, deploy everywhere — not separate native apps per platform.

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + backend | Next.js (React, App Router) | One codebase serves web, wraps into desktop and mobile |
| Desktop wrapper | Tauri (Rust-based) | Much lighter than Electron, wraps the Next.js app as a native desktop app |
| Mobile | PWA first (installable, home-screen icon, fullscreen) | Fastest path to "on my phone" without a separate native build; upgrade to React Native later only if PWA limits (e.g. push notifications) become a real problem |
| Auth / OAuth | Auth.js (NextAuth) | Handles Google, GitHub, Spotify login flows out of the box |
| Database | Supabase (Postgres) | Stores widget config, cached API data, habit/focus history; generous free tier |
| Scheduled refresh | Vercel Cron or Supabase Edge Functions | Keeps cached data fresh across all devices without each device hitting APIs directly |
| Hosting | Vercel (free tier to start) | Pairs naturally with Next.js |

## 4. Data freshness strategy

- **Cache-first, not fetch-on-open.** A scheduled background job refreshes
  data into Supabase on an interval; every device just reads the cache —
  fast, consistent, same data everywhere.
- Manual "refresh now" per widget for anything time-sensitive.
- Suggested refresh intervals:
  - Weather: every 30–60 min
  - Emails / GitHub notifications: every 5 min
  - Calendar / Tasks: every 10–15 min
  - Spotify top plays: every few hours
  - YouTube watch later: every 30 min

## 5. Architecture: widget/plugin system (monorepo)

### Folder structure

```
pulse/
apps/
    web/                 (Next.js shell — dashboard, auth, routing)
    desktop/             (Tauri wrapper around the web build)
packages/
    ui/                  (shared design system components)
    widgets/
        calendar/
        github/
        spotify/
        youtube/
        weather/
        focus/
        habits/
        email/
    sdk/                 (Widget interface/contract)
    adapters/            (one adapter per external service — see Adapter layer below)
    auth/
    database/
    shared/
    utils/
supabase/                (migrations, edge functions)
docs/
README.md
```

Each widget package owns everything about itself:

```
widget.ts       (registration + metadata)
component.tsx   (render)
types.ts
fetch.ts        (data fetching logic, called by cron — not by the client)
settings.ts     (user-configurable options)
icon.tsx
```

The shell only ever does `registerWidget(CalendarWidget)` — it never imports
widget internals directly.

### Widget SDK (contract every widget implements)

```ts
export interface Widget {
    id: string
    name: string
    size: WidgetSize
    refreshInterval: number
    fetchData()
    render()
    settings()
    permissions()
}
```

Every widget (`CalendarWidget`, `GitHubWidget`, `SpotifyWidget`, etc.)
implements this same interface — the shell only knows the contract, never the
specifics. This is what makes "add a widget = add a file" true in practice,
not just in theory.

### Data flow — cron-first, never direct

```
External API → Scheduler (Cron / GitHub Actions / Edge Function) → Supabase cache → Dashboard
```

Never `Dashboard → API` directly. Client devices only ever read from Supabase
cache. Avoids API rate limits, slow loads, and inconsistent data across
devices. The scheduler should be replaceable (swap Vercel Cron for GitHub
Actions, say) without changing any widget.

### Adapter layer

Every external service gets its own adapter (Google adapter, GitHub adapter,
Spotify adapter, Weather adapter, YouTube adapter). Adapters own:
authentication, API requests, response parsing, data normalization, error
handling. Widgets never call external APIs directly — they consume
normalized data the adapter hands them. This is what lets a widget's UI code
stay identical even if the underlying API changes or gets swapped.

### Event bus (deferred, not v1)

Planned for later once widgets genuinely need to react to each other — e.g.
starting a focus session pausing Spotify, updating a habit streak, setting a
Discord status. Example events: `focus.started`, `focus.ended`,
`calendar.updated`, `github.synced`, `habit.checked`, `spotify.playing`.

**Decision: do not build this for v1.** Building a pub/sub system before
there are real cross-widget cases is speculative infrastructure — revisit
once 2-3 widgets have an actual need to talk to each other.

### Monorepo tooling note

This structure implies Turborepo or Nx to manage builds/dependencies between
packages. Real overhead for a solo project — worth it for a multi-month
effort, but a deliberate trade to make consciously, not adopt by default.

## 6. Widget contract

Every widget owns:

- UI component
- Data fetch logic
- Cache logic
- Settings
- Refresh interval
- Permissions
- Loading state
- Error state
- Empty state

The dashboard shell owns:

- Authentication
- Widget registration
- Layout/grid
- Persistence
- Rendering
- User preferences

The shell should never contain widget-specific business logic.

## 7. Definition of done (per widget)

A widget is only considered complete when it has:

- Registered with the widget registry
- Fetches real data
- Stores data in cache
- Reads from cache
- Loading state
- Error state
- Empty state
- Manual refresh
- Settings support, **unless** the widget is meant to run fully automatically
  with no per-user configuration (2026-07-24, Ken's request — see
  docs/DECISIONS.md; currently just Hero: name comes from the login
  profile, time zone/location are fixed constants)
- Responsive layout
- Dark mode support, kept functional as a fallback for OS/device dark mode
  but not the actively designed theme as of the 2026-07-24 light-blue
  redesign (see docs/DECISIONS.md) — light mode gets the design/polish
  pass, dark mode just needs to not break
- No TypeScript errors
- No ESLint warnings

## 8. Database schema

Core tables:

```
users
widget_registry     (which widgets exist, metadata)
user_widgets        (which widgets a user has enabled, layout/order/size)
widget_settings     (per-user, per-widget config)
widget_cache        (id, widget_id, user_id, json, updated_at)
widget_events       (for the future event bus — not used in v1)
memories            (id, user_id, source, title, description, metadata,
                     created_at — Memory/Timeline feature, see
                     docs/MEMORY_ROADMAP.md; distinct from widget_events)
focus_sessions
habits
tasks
```

Key decision: use one generic `widget_cache` table (widget_id, user_id, json
blob, updated_at) instead of a separate table per data source
(`calendar_cache`, `github_cache`, etc.). Each widget stores whatever JSON
shape it wants; the shell/DB layer doesn't care what's inside. This avoids a
schema migration every time a new widget is added.

## 9. Core widgets (v1 / MVP)

1. Good morning greeting (time-based, local)
2. Today's schedule (Google Calendar API)
3. Today's tasks (own store, or Todoist/Notion API)
4. Unread emails (Gmail API — readonly scope)
5. Weather (Open-Meteo or OpenWeather API)
6. Current project from GitHub (GitHub API — commits, open PRs)
7. Focus time (local timer/Pomodoro tracking, stored in Supabase)
8. Quote (static/rotating list or quote API)
9. Habit progress (own tracker)
10. YouTube watch later list (YouTube Data API)
11. Quick shortcut apps (local config, just launch links/icons)
12. Spotify top plays (Spotify Web API)

### Widget development order

Build in this order — each widget should introduce only one new technical
challenge whenever possible:

1. Weather (no auth — proves the SDK/render pattern)
2. Greeting (no data source at all)
3. Clock (local, trivial)
4. Calendar (first OAuth widget)
5. GitHub (second OAuth provider, adapter reuse)
6. Tasks
7. Email (Gmail readonly scope)
8. Focus timer (first write-back — local state, no external API)
9. Habits (write-back to own table)
10. Spotify (third OAuth provider)
11. YouTube
12. Quick launch (no data source, pure config)

## 10. Wider widget backlog (post-MVP, don't build until core 12 are in daily use)

- **Daily:** clock, weather, calendar, tasks, email, GitHub (core, above)
- **Productivity:** weekly goal, deep work tracker
- **Developer:** latest git commits, open PRs, CI status, Vercel deployments,
  Claude/OpenAI API usage, Docker containers, local servers
- **Personal:** finance summary, weight tracker, water intake, sleep
- **Entertainment:** Steam wishlist, recently played

Architecture (widget SDK) already supports all of these without shell
changes — the discipline is sequencing, not capability.

## 11. APIs/integrations needed

- Google Calendar API
- Gmail API (readonly scope)
- GitHub REST API
- Spotify Web API
- YouTube Data API
- Weather API (Open-Meteo — free, no key needed — or OpenWeather)
- Optional later: Todoist/Notion API for tasks

## 12. Roadmap

### Phase 0 — setup (before any code)

- Create GitHub repo, decide monorepo tool (Turborepo or Nx)
- Set up Next.js app in `apps/web`
- Create Supabase project (DB + auth)
- Register OAuth apps: Google Cloud Console (Calendar + Gmail scopes), GitHub
  OAuth App, Spotify Developer app, YouTube Data API key
- Deploy an empty "hello world" Next.js app to Vercel — confirms the pipeline
  works before building features
- **Gate to move on:** you can log in with at least one provider and see your
  own name/data echoed back

### Phase 1 — MVP (read-only dashboard, ~2-3 weeks)

- Week 1: Build the widget SDK interface + shell that can `registerWidget()`
  and render a grid of cards. Build one widget end to end (recommend weather
  — no OAuth needed) to prove the pattern.
- Week 2: Add OAuth-backed widgets one at a time — calendar, GitHub, email.
  Each one: fetch function (cron-called), cache write to `widget_cache`,
  component render. Build the widget settings/manage screen (toggle,
  reorder) alongside — forces you to keep the SDK honest.
- Week 3: Add remaining widgets (Spotify, YouTube, focus timer stub, habit
  stub, quote, quick launch). Wire up the responsive grid (desktop/tablet/
  mobile breakpoints). Deploy to Vercel, install as PWA on phone, wrap with
  Tauri for desktop.
- **Gate to move on:** see Success gates below — do not proceed to Phase 2
  until they're met

### Phase 2 — make it actionable

- Task check-off with write-back to source
- Start/stop focus session from the dashboard, logged to `focus_sessions`
- Habit check-ins logged to `habits`
- **Gate to move on:** write-back features feel reliable, not fragile — no
  data loss, no silent failures

### Phase 3 — personal analytics

- Historical views: habit streaks over time, focus time trends, weekly
  summaries
- Optional end-of-day "night mode" reflection view
- **Gate to move on:** genuinely deciding whether to keep this personal-only
  or pursue Phase 4 — not a default next step

### Phase 4 — publish (optional, only if you want it)

- Multi-user auth (Supabase auth already supports this — mostly a config
  change since widget data is already keyed by `user_id`)
- Per-user widget config UI (you already built this for yourself in Phase 1
  — extend it to let others pick their own widgets)
- Revisit the "Pulse" name before any public listing
- Possible small widget marketplace

### Sequencing notes

- Don't build the event bus, or the wider widget backlog (finance, sleep,
  Docker, CI status, etc.) until Phase 1 is in solid daily use — the
  architecture supports adding them anytime, so there's no cost to waiting
- Timebox is effort-based, not calendar-based — move to the next phase when
  the gate condition is true, not when a date passes

## 13. Development principles

- Build vertical slices, not horizontal layers.
- Finish one widget completely before starting the next.
- Improve the widget SDK after every completed widget.
- Keep the dashboard shell generic — it should never know widget-specific logic.
- Prefer deleting unnecessary abstractions over adding new ones.
- Optimize for daily usability, not feature count.
- Ship first, polish later.
- Every new feature must justify its maintenance cost.

## 14. Security

- Store all secrets in environment variables.
- Never commit `.env` files.
- Only expose `NEXT_PUBLIC_*` variables to the client.
- Keep OAuth client secrets server-side.
- Never expose Supabase Service Role keys.
- Validate all incoming API requests.

## 15. Performance goals

Target metrics:

- Initial dashboard load under 2 seconds
- Widget refresh under 1 second (cached)
- API synchronization handled in background
- Lighthouse Performance: 90+
- Lighthouse Accessibility: 90+
- Lighthouse Best Practices: 90+

Note: Lighthouse SEO score is not a relevant target — Pulse is a private,
login-gated personal dashboard with nothing to index, so optimizing for
search visibility has no payoff here.

## 16. Non-goals (MVP)

The following are intentionally excluded from Phase 1:

- AI assistant / chatbot / voice assistant
- Team collaboration
- Notifications
- Marketplace
- Third-party plugins
- Native mobile app / React Native
- Linux desktop support
- Offline sync
- Themes
- Advanced animations

## 17. Project documentation

Maintain the following project documents alongside this reference:

- **README.md** — project overview and setup instructions
- **ROADMAP.md** — development roadmap and project phases
- **ARCHITECTURE.md** — system architecture, widget SDK, caching strategy, data flow
- **DESIGN_SYSTEM.md** — UI components, spacing, typography, colors, icons, layout rules
- **CLAUDE.md** — project context, coding standards, development workflow, instructions for Claude Code
- **DECISIONS.md** — record of important architectural decisions and the reasoning behind them

## 18. Success gates (Phase 1)

Phase 1 is complete only when:

- You open Pulse every morning.
- You no longer check Calendar separately.
- You no longer check GitHub separately.
- You trust the dashboard data.
- At least one widget has become part of your daily workflow.
- You have used Pulse daily for at least two consecutive weeks.

Do not proceed to Phase 2 until these conditions are met.

## 19. UI / design principles

Superseded twice — first 2026-07-24 by the Liquid Glass redesign, then
2026-07-26 by the "Classical" redesign (see docs/DECISIONS.md for both).
Pulse's actual design system is now `docs/DESIGN_SYSTEM.md` in full
(Classical: serif type, flat paper background, hairline borders, single
gold accent, no blur/gradient). This section records only the
structural/layout decisions that doc doesn't cover — most of the bullets
below predate the Classical pass and are still accurate structurally
(grid shape, Hero's content, menu behavior, hover semantics); the
material/color specifics they mention (glass tint/blur, the gradient
background) are superseded by `docs/DESIGN_SYSTEM.md` v2.0:

- ~~A real glass system (`packages/ui/src/glass.ts`: light/medium/heavy —
  tint, blur, inset highlight, layered shadow), not `bg-white/opacity`.~~
  Superseded 2026-07-26: `glass.ts` keeps the same three exported names
  for API stability, but each level is now a flat bordered card with no
  blur or translucency.
- ~~**Background is one smooth diagonal gradient** (sky → cyan → violet;
  `apps/web/src/app/page.tsx`)~~ Superseded 2026-07-26: the background is
  now a flat paper tone (`--background`), not a gradient.
- **Bento-style grid, not uniform columns**: each widget's existing SDK
  `size` field (`sm`/`md`/`lg`) picks how many grid columns it spans, so
  the richest widget becomes an actual focal point (currently GitHub,
  `"lg"`, spans 2 of 3 desktop columns) instead of every card getting
  identical width. No left-border accents — widget identity comes from
  the icon and title, not a color; every widget's icon badge shares the
  same outlined accent treatment (superseded 2026-07-26: previously a
  per-widget colored glow — blue/green/indigo — see docs/DECISIONS.md).
- **Hero is one flowing "assistant" panel**, not floating text or stat
  chips (2026-07-25, superseding the "row of today chips" version below):
  a greeting headline, then one sentence combining date/time and weather
  — plus a deterministic, rule-based weather tip (e.g. rain codes → "Take
  an umbrella"; `packages/widgets/hero/src/weather-tip.ts`, no LLM call,
  no external cost) — and a quote line underneath. Cross-widget insights
  (e.g. referencing GitHub's streak from inside Hero) were considered and
  deliberately left out to keep scope to what was actually asked for —
  see docs/DECISIONS.md if picking this up later.
- **No navigation chrome beyond the navbar** (2026-07-25, reversing the
  entry below — Ken reported never using it: "all i need is just to see
  cards"). Sidebar, Dock, and BottomNav were deleted entirely, not hidden
  behind a flag; same for the navbar's Search/Notification icons. The
  navbar is just the Pulse wordmark and the profile menu.
- **Every dropdown (profile menu, per-widget "⋯" overflow menu) closes on
  outside click** via real client-side state (`useState` + a
  `pointerdown` document listener checking whether the event's outside the
  menu's root), not CSS `:focus-within`. `:focus-within` was the fix for
  an earlier bug (a `position: fixed` backdrop nested inside a
  backdrop-blur ancestor never covers the full viewport — see
  docs/DECISIONS.md), but doesn't reliably work on mobile/iPad Safari,
  where a tap doesn't always move DOM focus onto a `<button>` — confirmed
  as a real bug via Ken's own device testing, fixed 2026-07-25.
- Every widget's action slot is a single **"⋯" overflow menu**
  (`WidgetMenu` in `packages/ui`) — Refresh, and Settings when the widget
  has any — instead of a bare icon button plus a separate below-card
  Settings toggle. Room for future actions without redesigning the card.
- The header's account control is a compact profile pill (avatar/initial +
  name) with a dropdown for Settings (placeholder) and Sign out, not a bare
  "Signed in as X / Sign out" text row.
- **Card hover is a static color cue, not motion** (2026-07-25, Ken's
  request): no lift, no scale — `GLASS_HOVER` brightens the card's
  border/ring on hover instead. Steam's cover art follows the same
  pattern (a border light-up via `group-hover`) rather than scaling the
  whole tile. Buttons (refresh, settings, profile, sign-in) keep their
  scale-on-press feedback (`SPRING_PRESS`) — this only applies to card-
  and tile-level hover, not button interaction.
- **The bento grid doesn't stretch cards to fill their row** (2026-07-25):
  the grid gained `items-start` after a tall Steam card (see below) was
  stretching its shorter row-mates (GitHub, Quick Launch) to match its
  height via CSS Grid's default `align-items: stretch` — each card now
  sizes to its own content.
- Cards should be full of real content, not sparse — but only ever real,
  fetched data. GitHub gained a "latest repository/commit" section
  (2026-07-25; a new GraphQL query — deliberately deferred in an earlier
  pass as "not polish," then built once it was actually asked for).
  Steam's card was deliberately simplified back down the other direction
  (2026-07-25): it now shows only cover art + title, matching a reference
  game-library shelf image — hours/last-played/achievement data moved to
  a new per-game detail page (`apps/web/src/app/steam/[appId]`) rather
  than being crammed onto the card. Never fill empty space with an
  invented number.
- Quick Launch is icon-only (no text labels), small fixed-size tiles
  (`h-11 w-11`, matching icon size rather than stretching to fill a grid
  cell) — each link's own favicon, fetched directly from its domain, with
  a generic fallback icon on load failure.
- Avoid adding more detail to mobile cards just because there's a full
  screen — keep cards content-appropriate per breakpoint rather than a
  uniformly shrunk desktop layout; extra detail belongs behind a
  tap-through, not crammed into the card.

<details>
<summary>Superseded 2026-07-25: adaptive per-breakpoint navigation (dock/drawer/bottom-nav)</summary>

Kept for history — Ken reported never using any of this, so it was
deleted outright rather than iterated on further:

- Desktop (`lg:` 1024px+): a floating glass **dock**, bottom-center — not
  a pinned sidebar rail (2026-07-24 refinement pass: replaced the rail
  after Ken judged it "still feels disconnected").
- Tablet (`sm:`–`lg:` 640–1024px): an off-canvas sidebar drawer, toggled
  by a menu button in the navbar — a checkbox + `peer-checked:` CSS
  toggle, no client JS.
- Mobile (below `sm:` 640px): a fixed glass bottom nav bar — a
  "glanceable companion," not a shrunk desktop layout.

Only "Dashboard" was ever a real, active destination in any of these;
Tasks and Habits were visible, disabled placeholders for future sections.
</details>

## 20. Known risks / things to watch

- **"Builder trap"**: personal dashboards are fun to keep tweaking
  indefinitely — timebox Phase 1 (e.g. 3 weeks) and force daily real use
  before adding scope
- OAuth token storage requires a backend — ruled out a pure local/offline-only app
- If publishing to others later, don't hardcode Ken's specific widget set as
  "the product" — the shell + widget system is the product
- Monorepo (packages/apps split) adds real tooling overhead
  (Turborepo/Nx) for a solo builder — a deliberate trade, not a default
- Event bus is deferred to post-v1 — don't build speculative pub/sub
  infrastructure before 2-3 widgets have a genuine need to talk to each other
- Project name "Pulse" collides with several existing productivity/dashboard
  apps — fine for personal use, reconsider before any public launch

## 21. Open decisions / not yet settled

- Whether to eventually move mobile from PWA to React Native (only if PWA
  limitations, e.g. iOS push notification restrictions, become a real
  blocker)
- Whether/when to pursue multi-user publishing vs. keeping it personal-only
  indefinitely
