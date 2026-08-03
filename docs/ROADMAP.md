# Roadmap

Full phase definitions and gates live in `docs/PROJECT_REFERENCE.md` §12
and §18 — this doc tracks live status against them.

The Memory/Timeline feature (event log → Timeline page → daily summaries
→ semantic search → "Ask Pulse" assistant) has its own milestone track,
independent of the Phase 0-4 numbering below — see
`docs/MEMORY_ROADMAP.md`.

## Phase 0 — setup

- [x] GitHub repo, monorepo tool decided (Turborepo — see `docs/DECISIONS.md`)
- [x] Next.js app scaffolded in `apps/web`
- [x] Widget SDK contract defined (`packages/sdk`)
- [x] Auth.js wired with GitHub as first provider
- [x] Core DB schema migrations written (`supabase/migrations/`)
- [x] Supabase project created
- [x] GitHub OAuth App registered
- [x] Deployed to Vercel (custom subdomain — renamed
      2026-07-24 from `[redacted-old-domain]`; requires `AUTH_URL`
      and the GitHub OAuth App / Spotify app callback URLs to match, see
      docs/DECISIONS.md)
- [x] **Gate:** log in with GitHub, see your own name echoed back — confirmed

**Phase 0 is complete.**

## Phase 1 — MVP (read-only dashboard)

**Widget-build scope is complete.** Every widget on the active target list
(§9) is built and live; the only remaining Phase 1 item is the personal-
usage gate in §18 (two consecutive weeks of daily use), which is a
manual call to confirm, not something tracked here. In practice the project has
already moved into Phase 2 territory in parallel — see that section below.

Per the reference doc's original widget development order (§9):

1. [x] Weather (no auth) — end-to-end: `packages/adapters/weather`
   (Open-Meteo), `packages/widgets/weather` (Widget contract impl),
   `packages/ui` (shared `WidgetCard`/`ActionForm`), dashboard grid reading
   from `widget_cache`, manual refresh + settings (location), and a
   GitHub Actions scheduler calling `/api/cron` every 30 min (Vercel Cron's
   Hobby tier can't go more frequent than daily — see `docs/DECISIONS.md`).
   `CRON_SECRET`/`PULSE_URL` are now set — **scheduler confirmed running**
   every 30 min for every widget. See README if setting this up fresh.
2. [x] Greeting — `packages/widgets/greeting`: time-of-day message
   personalized by name, no adapter needed (pure local computation).
   Confirms "add a widget = add a file" — only shell change was
   registering it in `apps/web/src/lib/register-widgets.ts` and adding the
   package dependency. Resolves the greeting's hour in a saved IANA time
   zone (default `Asia/Manila`) since the server itself runs in UTC.
3. [x] Clock — `packages/widgets/clock`: the first widget where
   `render()` ticks client-side every second (`"use client"` +
   `setInterval`) instead of displaying cached data — caching "the time"
   on a 15-30 min cron cycle would just show a frozen, wrong clock between
   refreshes. `fetchData()` still exists (SDK contract requirement) but is
   a no-op; the real per-widget state is the timezone/12h-24h setting.
4. [removed] Calendar (first OAuth widget — Google) — originally deferred
   pending Google Cloud Console setup time; **permanently removed from
   scope 2026-08-01** — a decision against ever building it. Skipped
   ahead to GitHub at the time; see the "Documentation accuracy pass"
   entry below for the full removal.
5. [x] GitHub — `packages/widgets/github` + `packages/adapters/github`:
   contribution counts (today / this week / this year) plus a full
   Jan–Dec calendar-year heatmap (month/weekday labels, Less→More
   legend, hover/tap day popovers — expanded 2026-07-29 from an initial
   compact 20-week window, see `docs/DECISIONS.md`), via GitHub's GraphQL
   `contributionsCollection`. Scoped down from the original "commits +
   open PRs" concept by explicit request — kept deliberately simple. Reuses
   the login token from `next_auth.accounts` (`readProviderAccessToken`
   in `packages/database`) — no scope change, no second OAuth flow, no
   settings. Establishes the "widget using the login provider's token"
   pattern that Spotify/Google widgets will follow.

Also shipped, pulled forward from the §10 backlog by explicit request:

- [x] Steam (recently played) — `packages/widgets/steam` +
  `packages/adapters/steam`: top 5 games from the last 2 weeks via
  `GetRecentlyPlayedGames` (official endpoint, API key auth — no OAuth).
  Needs `STEAM_API_KEY` in Vercel and the user's SteamID64 in widget
  settings; the Steam profile's "Game details" privacy must be Public or
  the API silently returns an empty list (the empty state says so). Also
  surfaced a real bug fixed alongside it: any widget whose *first-ever*
  interaction is a settings save (rather than a fetch) violated a foreign
  key, since `widget_registry` rows were only ever created inside
  `fetchData()`. `updateWidgetSettingsAction` now calls
  `ensureWidgetRegistered()` itself — see `docs/DECISIONS.md`.

### Setup notes for specific features

**GitHub Actions scheduler** (keeps every widget auto-refreshing every 30
min without manual clicks — confirmed working):
1. Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Add it as `CRON_SECRET` in Vercel → Settings → Environment Variables, redeploy.
3. In the GitHub repo → Settings → Secrets and variables → Actions: add a
   **repository secret** `CRON_SECRET` (same value), and a **repository
   variable** `PULSE_URL` set to the deployed URL (no trailing slash).
4. Runs automatically every 30 min; trigger manually from the Actions tab
   ("Run workflow") to test immediately. Without this, widgets still work
   via each card's manual "Refresh" button.

**Steam widget**:
1. Get a key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
   (any domain value accepted; requires a non-"limited" Steam account —
   i.e. one that's made at least one purchase).
2. Add it as `STEAM_API_KEY` in Vercel → Settings → Environment Variables, redeploy.
3. On the dashboard, open the Steam card's Settings and enter your
   17-digit SteamID64 ([steamid.io](https://steamid.io) helps if your
   profile uses a custom URL).
4. Your Steam profile's **Game details** privacy must be Public — Steam
   silently returns an empty list otherwise, with no error.

**Spotify widget**:
1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. Add Redirect URI: `<your deployed URL>/api/auth/callback/spotify`
   (click **Add**, not just type it in the field).
3. Under "Which API/SDKs are you planning to use?", check **Web API** only.
4. Save, then copy the **Client ID** and **Client Secret** from the app's dashboard.
5. Add both as `AUTH_SPOTIFY_ID`/`AUTH_SPOTIFY_SECRET` in Vercel → Settings
   → Environment Variables, redeploy.
6. On the dashboard, click **Connect Spotify** on the card, authorize.

### Phase 1 rescoped (2026-07-22)

The remaining build order was reviewed and the following judged not
useful long-term — dropped from active scope, not deleted from the
plan; trivial to revive later since nothing about the architecture depends
on building them in order:

- [x] Tasks — skipped here as "doesn't track tasks in any tool," but
  later built anyway (own Supabase-backed store, `packages/widgets/tasks`,
  `/tasks` page) — see the Phase 2 section below.
- [removed] Email (Gmail readonly) — **permanently removed from scope
  2026-08-01**, not just deferred; a decision against ever building it.
- [removed] Focus timer — **permanently removed from scope 2026-08-01**,
  not just dropped-for-now; a decision against ever building it.
- [~] Habits — dropped (reopened 2026-07-26 as a "Coming soon" placeholder
  only, not a real widget yet — see `docs/DECISIONS.md`)
- [removed] YouTube — **permanently removed from scope 2026-08-01**, not
  just blocked; a decision against ever building it.
- [removed] Calendar (Google) — **permanently removed from scope
  2026-08-01**, not just deferred; a decision against ever building it.
  (The unrelated "Calendar (date display)" widget further below, a plain
  local date string, was already built and later merged into Hero — this
  removal is only about the Google Calendar integration.)

**Remaining active target for Phase 1**, in priority order:

1. [x] Quote — `packages/widgets/quote`: ~40 hand-curated quotes across 7
   themes (coffee, dev humor, gaming, minimalism, relationship,
   programming, stoicism) — deliberately not generic motivational quotes,
   and no attribution shown (kept minimal by explicit request; see
   `docs/DECISIONS.md` for sourcing notes on the ones with real quotes
   behind them). No adapter — static local data. Picks a random quote on
   every `fetchData()` call (cron *and* manual refresh both rotate it,
   avoids repeating the immediately-previous pick) rather than locking to
   one quote per calendar day, so the "Shuffle" button is actually useful.
   A second clean confirmation of the normal fetch → cache → render
   pattern, alongside Clock's deliberate exception to it.
2. [x] Quick launch — `packages/widgets/quick-launch`: up to 6
   label+URL shortcut links, plain text (no favicons, per the minimal
   preference — matches Quote's no-attribution stance), open in a new
   tab. Fixed-slot settings form (6 label/URL field pairs, blank = unused)
   rather than a dynamic add/remove list — same plain-form-fields pattern
   every other widget uses, no new client-side array-editing UI needed.
   Pure config, no adapter, no external call at all — `fetchData()` is
   nominal like Clock's.
3. [x] Spotify — `packages/widgets/spotify` + `packages/adapters/spotify`:
   top 5 tracks (medium-term/~6-month window), `user-top-read` scope only.
   Third OAuth-backed widget, and the first where the OAuth provider isn't
   also the login provider — handled with a custom "Connect Spotify" flow
   (`/api/connect/spotify` + `/api/auth/callback/spotify`) rather than a
   NextAuth provider, plus token-refresh logic in the widget's own
   `fetch.ts` since Spotify access tokens expire hourly. See
   `docs/DECISIONS.md` for the full reasoning. Needs `AUTH_SPOTIFY_ID`/
   `AUTH_SPOTIFY_SECRET` in Vercel — see "Setup notes" above.

**Phase 1's rescoped target is now fully built: 8/8.**

**Also added, beyond the rescoped 8, by explicit request:**

- [x] Calendar (date display) — `packages/widgets/calendar-date`: plain
  text "today's date" (e.g. "Thursday, July 24, 2026"), no grid, no
  navigation. Deliberately **not** the deferred Google Calendar
  integration — this is a completely different, zero-setup widget that
  happens to share the "Calendar" name in the UI. Same shape as Greeting:
  pure local computation, timezone-aware (server runs UTC), no adapter.
  Package/widget id is `calendar-date` (not `calendar`) specifically so a
  real Google Calendar widget can use the plain `calendar` id later
  without a rename or collision.

### Redesign (2026-07-24): Greeting/Weather/Quote merged into Hero

Following the two-tone card redesign, the Greeting, Weather,
and Quote cards were requested to become one full-width hero banner above the grid
(`packages/widgets/hero`) instead of three separate cards — see
`docs/DECISIONS.md`. `packages/widgets/greeting`, `packages/widgets/weather`,
and `packages/widgets/quote` were deleted (their logic now lives inside
`hero`); `packages/adapters/weather` is unchanged and reused directly by
`hero`. (Superseded by the next entry below — Hero no longer has a Settings
panel at all.)

### Redesign v2 (2026-07-24): light-blue theme, Clock/Calendar into Hero, graphs, icon refresh

Same-day follow-up after the live redesign above was reviewed. Changes:

- **Theme:** reverted the two-tone black/white cards to a light-blue theme
  (gradient page background, white cards, colored icon badges) matching a
  second design reference. Dark mode's `dark:` variants stay in the code as
  a fallback but are no longer the actively designed target — see
  docs/DECISIONS.md and the amended §7 in `docs/PROJECT_REFERENCE.md`.
- **Hero absorbs Clock and Calendar too**: `packages/widgets/clock` and
  `packages/widgets/calendar-date` were deleted; their date/live-clock
  display now lives inside `packages/widgets/hero` alongside the
  greeting/weather/quote. Hero is now genuinely one banner replacing what
  were 5 separate widgets.
- **No settings anywhere in Hero**: name comes automatically from the
  GitHub login profile (`readUserName` in `packages/database`), time zone
  and weather location are fixed constants (`Asia/Kuching`) rather than a
  setting — requested to "just work" with no configuration step.
  This is a real, deliberate scope-down from reference doc §7's normal
  "settings support" requirement — amended there with the exception noted.
- **Graphs**: Steam's recently-played list now shows a horizontal bar per
  game (relative to the longest-played game, single blue hue) instead of
  plain text; GitHub's contribution heatmap recolored from green to the
  same blue. Spotify intentionally has no graph — its API doesn't expose
  play counts or listening time, so there's no real data to chart.
- **Refresh buttons are icon-only** now (`ActionForm`'s `variant="icon"`)
  across every widget — a circular-arrow SVG instead of a text button,
  `aria-label`/`title` keep it accessible.

### Redesign (2026-07-24): Liquid Glass — full visual system replacement

The light-blue redesign was reviewed live and judged "functional but
not achieving the intended experience" — an admin-panel feel, flat, weak
hierarchy, unfinished-looking. A full authored design system
doc was provided (now `docs/DESIGN_SYSTEM.md` in its entirety) along with a request for a genuine
redesign against it, not a polish pass. Full critique/proposal/rationale
and every implementation decision recorded in `docs/DECISIONS.md`. Summary:

- Real glass materials (`packages/ui/src/glass.ts`: light/medium/heavy)
  replace `bg-white/opacity` cards — tint, blur, inset highlight, layered
  shadow.
- Layered ambient background (soft neutral base + three blurred color
  blobs) replaces the flat gradient.
- **Bento grid**: widgets' existing `size` field (`sm`/`md`/`lg`) now
  drives column span, so GitHub (`"lg"`) is a real focal widget instead of
  every card being equal width. Left-border accents removed — identity
  comes from a colored glow behind each widget's icon badge instead.
  Steam and Spotify are `"md"`, Quick Launch `"sm"`.
- Hero rebuilt as one grouped glass panel (greeting + a row of "today"
  chips: date/time, weather, quote) instead of floating text blocks.
- **Adaptive navigation, not just responsive resizing**: permanent sidebar
  on desktop (`lg:`), the same sidebar becomes a toggleable off-canvas
  drawer on tablet (`sm:`–`lg:`, checkbox + CSS `peer-checked:`, no client
  JS), replaced entirely by a fixed bottom nav bar on mobile.
- Icons switched to Lucide (the spec's recommendation) for every
  system/nav icon; the three widget brand marks (GitHub, Spotify, Steam)
  stay hand-drawn since Lucide has no brand-icon set in the installed
  version.
- Spring-ish hover/press motion on cards and buttons, gated behind
  `motion-safe:` so reduced-motion users get none of it.
- `docs/PROJECT_REFERENCE.md` §19 rewritten to point at
  `docs/DESIGN_SYSTEM.md` as the actual design system, keeping only the
  structural/layout decisions that doc doesn't cover.

### Refinement pass (2026-07-24): glass fix, real widget polish, overflow menus

The Liquid Glass redesign was judged "a major improvement" but flagged
specific gaps: the glass looked solid white, Steam's bars looked
Material-Design, GitHub (the largest widget) under-used its space, and the
sidebar "still feels disconnected." Explicit instruction: polish/consistency
only, no further layout redesign. Full root-cause investigation and every
decision in `docs/DECISIONS.md`. Summary:

- **Fixed the glass rendering bug**: root-caused via a real screenshot
  (not guessing) to fill opacity too high (55–80%) combined with background
  blobs not vibrant/close enough to actually read through the cards.
  Lowered fill opacity (`packages/ui/src/glass.ts`) and strengthened the
  background blobs (`apps/web/src/app/page.tsx`) — color now genuinely
  bleeds through every card.
- **Steam's progress bars** rebuilt: glass track, gradient+glow fill, a
  CSS keyframe grow-in animation, larger game art (`packages/widgets/steam/src/playtime-bar.tsx`).
- **GitHub widget** enlarged and given more to show: heatmap window
  20 weeks (was 12), bigger cells, plus **current streak** and **longest
  streak** — both computed from data already fetched, no new API call
  (`packages/widgets/github/src/streaks.ts`). "Latest repository/commit"
  considered and deliberately deferred — needs a new GitHub API call,
  which is a feature addition, not polish.
- **Every widget's action slot is now a single "⋯" overflow menu**
  (`packages/ui/src/widget-menu.tsx`) instead of a bare refresh icon plus
  (for Steam/Quick Launch) a separate below-card Settings toggle.
- **Fixed dropdown click-outside-to-close** for both the profile menu and
  the new widget overflow menus — root cause was backdrop-blur on an
  ancestor breaking `position: fixed` backdrops (see docs/DECISIONS.md).
  Switched both to CSS `:focus-within`, no client JS.
- **Desktop navigation**: the pinned sidebar rail replaced with a floating
  bottom-center glass dock — an explicit ask after judging the rail
  "disconnected." Tablet drawer and mobile bottom nav unchanged.
- Radius/motion consistency audit across nav chrome (a couple of
  `rounded-lg` outliers bumped to the same `rounded-xl` used everywhere
  else).
- Spotify's "now playing" emphasis treatment and the commit-signature stop
  hook were explicitly out of scope for this pass, per instruction.

### Follow-up polish (2026-07-24): reference-matched gradient, denser cards, Steam achievements, icon-only Quick Launch

A reference screenshot was shared with a request for the background/cards to
match it, cards to feel fuller, Quick Launch to go icon-only, and Steam to
show more per-game detail — with explicit instruction to ask clarifying
questions first (four real open decisions, all resolved via
`AskUserQuestion` before writing code; see docs/DECISIONS.md for the full
reasoning behind each):

- **Background**: replaced the layered-blob approach with one smooth
  diagonal gradient (sky → cyan → violet), matching the reference more
  closely. Also fixed a real bug surfaced along the way — the blob
  approach's low glass opacity had been a workaround for making color
  visible behind cards; the smooth gradient needed the same low-opacity
  glass tokens to actually read through.
- **Steam**: now shows only 2 games (was 5), each with real **last-played**
  date (`GetOwnedGames`'s `rtime_last_played` — one call for the whole
  library) and real **achievement completion** (`GetPlayerAchievements`,
  per game — only 2 calls now that the list is shorter). Returns `null`
  (not an error) for games with no achievements, which is the common case.
- **Quick Launch**: icon-only, no text labels — each link's own
  `https://{domain}/favicon.ico`, fetched directly (no third-party favicon
  proxy), with a generic fallback icon. Fixed a real SSR race along the
  way: a fast favicon failure can fire the image's error event before
  React hydrates and attaches `onError`, silently losing the fallback —
  caught with a `complete && naturalWidth === 0` check in a `useEffect`
  on mount, verified via a DOM-state Playwright check (not just a
  screenshot) before and after.
- Card density improved generally by the above (real content replacing
  what would otherwise be sparse layout), not by inventing filler data.

### Follow-up polish (2026-07-25): mobile click fix, nav removal, GitHub/Steam/Hero content passes

Testing on real mobile/iPad devices found the overflow/profile
menus couldn't be opened by tap at all — a real, device-confirmed bug, not
a hypothetical. Combined with a further redesign list; all four open
decisions resolved via `AskUserQuestion` before writing code (nav removal,
GitHub content, Steam detail-page split, Hero intelligence style — see
`docs/DECISIONS.md` for the full reasoning):

- **Fixed the mobile/iPad click bug** (the real defect, not optional
  polish): `WidgetMenu` and `ProfileMenu` (the latter extracted out of
  `page.tsx` into its own `apps/web/src/app/profile-menu.tsx` client
  component) rebuilt with real `useState` open/close state and a
  document-level `pointerdown` outside-click listener, replacing the CSS
  `:focus-within` approach from the previous pass — `:focus-within`
  depends on a tap reliably moving DOM focus onto a plain `<button>`,
  which mobile/iPad Safari doesn't always do. Verified with a real
  touch-simulated Playwright tap, not just a screenshot. Also added
  `overflow-hidden` to `WidgetMenu`'s dropdown, fixing a hover-corner
  clipping bug (square item hover backgrounds poking past the rounded
  container — `ProfileMenu`'s dropdown already had this, `WidgetMenu`'s
  didn't).
- **Navigation removed entirely**: Sidebar, Dock, and BottomNav (and the
  drawer-toggle checkbox plumbing) deleted from `page.tsx` — never used
  in practice, "just cards" preferred. Search and Notification icon buttons
  (both permanently disabled placeholders) removed from the navbar too.
- **GitHub card filled out**: new `fetchLatestActivity` in
  `packages/adapters/github` (GraphQL `viewer.repositories(first: 1,
  orderBy: PUSHED_AT DESC)` → default branch's latest commit) renders as a
  "latest repo + commit" row beneath the heatmap — the "considered and
  deferred" item from the previous pass, now built since the card still
  read as half-empty.
- **Steam split into card + detail page**: the card now shows only large
  portrait cover art (Steam's CDN convention,
  `library_600x900.jpg`, built from `appId` with no extra API call) and
  the game title — matching a reference game-library shelf look. Hours,
  last-played, and achievements moved off the card onto a new
  `apps/web/src/app/steam/[appId]/page.tsx` detail page, reading the same
  already-cached `SteamData` (no new fetch). `playtime-bar.tsx` deleted
  (superseded).
- **Hero redesigned toward "assistant," not "stats"**: the three separate
  glass chips (date/time, weather, quote) replaced with one flowing
  sentence, plus a deterministic weather tip
  (`packages/widgets/hero/src/weather-tip.ts`, rule-based on the adapter's
  `weatherCode` — e.g. rain codes → "Take an umbrella") — explicitly *not*
  an LLM call, per stated preference. Cross-widget insights (GitHub
  streak / Steam playtime referenced from Hero) were considered but left
  out of this pass to keep scope to what was actually asked for.
- Quick Launch's icon tiles shrunk from large `aspect-square` grid cells
  to small (`h-11 w-11`) flex-wrapped tiles, matching icon size instead of
  stretching to fill a grid column.

**Gate to move on:** the Phase 1 success gates in the reference doc §18 —
daily use for two consecutive weeks, trusted data, at least one widget
replacing a separately-checked tool.

### Follow-up polish (2026-07-25): grid-stretch card sizing, static hover, cover-art fallback

The GitHub and Quick Launch cards were reported oversized (a CSS
Grid `stretch` default making them match the tallest card in their row —
fixed with `items-start` on the grid, see `docs/DECISIONS.md`), asked for
card hover to stop moving/scaling (replaced with a static border/ring
brightening on both `WidgetCard` and Steam's cover art), and asked why
one game's cover art fell back to a placeholder (added a one-step CDN
fallback — `header.jpg` then `capsule_616x353.jpg` — rather than a real
bug). Also did a cleanup pass: dead `.pulse-bar-fill` CSS left over from
the deleted `playtime-bar.tsx` removed from `globals.css`, and a fresh
touch-simulated Playwright audit re-confirming the mobile click fix
(GitHub/Steam/profile menus, Steam link, Quick Launch link all verified
working) with no hydration errors found — the "can't click any button"
report is most likely against the still-deployed `main`, which doesn't
yet include the previous entry's click-fix PR.

### Hardening pass (2026-07-25 onward): quality over features

The visual direction/layout was confirmed final — "do NOT redesign
the application" — reframing the work going forward as a senior-
engineer quality pass across the whole app: consistency, responsiveness,
accessibility, maintainability, performance, error handling, no
shortcuts. Given the scope, agreed to work in reviewable stages rather
than one pass, and to tune the existing 3-tier grid rather than build 7
distinct hand-designed breakpoint layouts (5 widgets doesn't warrant 7
layout variants) — see `docs/DECISIONS.md` for the full reasoning and
the complete staged roadmap.

- [x] **Stage 1 — Resilience**: a direct audit found the dashboard had
  no error isolation at all (`WidgetGrid` awaited every widget in one
  `Promise.all`; any single widget throwing failed the whole page) and
  no streaming (the grid blocked entirely on the slowest widget). Fixed
  with a real `WidgetErrorBoundary` (`packages/ui`) wrapping each
  widget's own `Suspense` boundary — verified with a temporary preview
  route where one widget deliberately threw: it showed an `ErrorState`
  while the other widgets, including a deliberately slow one, rendered
  normally. New `Skeleton` primitive as the Suspense fallback; new root
  `apps/web/src/app/error.tsx` as a last-resort safety net outside the
  grid. See `docs/DECISIONS.md` for why the first attempt (a plain
  `try/catch`) was wrong and how the real fix works.
- [x] **Stage 2 — Shared primitives & design tokens**: four real
  duplicates found by direct inspection, each extracted into
  `packages/ui` — `useDismissableMenu` (WidgetMenu/ProfileMenu's
  identical open/close logic), `Metric` (GitHub's and Steam's
  near-identical "label + big value" components, which had already
  drifted to different text sizes), `GLASS_CHIP` (the soft-tile surface
  copy-pasted between GitHub's commit row and Quick Launch, with
  inconsistent radii), and a `RADIUS` token scale (`chip`/`card`/`hero`,
  replacing ad hoc literals including Hero's bare `rounded-[32px]` magic
  value). One real visual fix included: Quick Launch's tiles now match
  the same 16px corner radius every other chip-shaped surface uses
  (previously 12px, the one true outlier). See `docs/DECISIONS.md` for
  what was deliberately *not* merged (Steam's achievement progress
  track stays its own literal — visually similar to `GLASS_CHIP` but not
  interactive, so forcing it through that token would carry an
  inapplicable hover state).
- [x] **Stage 3 — Accessibility**: verified with an automated `axe-core`
  audit (zero WCAG 2A/2AA violations, both before and after) plus manual
  keyboard/measurement testing axe-core can't catch on its own. Real
  fixes: touch targets bumped to a genuine 44×44px (`WidgetMenu`/
  `ActionForm`'s icon buttons were 32px), Escape now closes
  `WidgetMenu`/`ProfileMenu` and returns focus to the trigger, closed
  dropdown panels get `inert` (previously still tabbable while
  invisible — a real bug), the dropdown's scale transition is properly
  `motion-safe:`-gated (it wasn't, despite looking gated), and every
  `WidgetCard`/Hero is now a labelled `<section>` landmark instead of a
  bare `<div>`. `role="menu"` was considered and deliberately rejected —
  see `docs/DECISIONS.md` for why forcing that pattern here would be
  wrong, not just unfinished.
- [x] **Stage 4 — Consistent empty states**: six widgets each had their
  own bare-`<p>` "nothing yet" text with no shared layout. New
  `EmptyState` primitive (`packages/ui`) centers within the card's
  available height instead of sitting left-aligned at the top with dead
  space below, and supports an optional action (used by Spotify's
  "not connected" case, which previously showed a bare button with no
  explanatory text). Also caught and fixed three more Stage 2/3-class
  misses found while in these files: two more literal `rounded-2xl`/
  `rounded-xl` spots that should've been `RADIUS.chip`, and two more
  buttons under the 44px touch-target minimum.
- [x] **Stage 5 — Responsive verification**: reproduced real breakage
  via Playwright at 7 widths (desktop through phone) against the full
  dashboard, not assumed fine from single-widget checks. Found the
  `items-start` grid fix from an earlier pass never actually fixed the
  underlying issue — CSS Grid still sizes a row's *track* to its
  tallest cell regardless of `align-items`, so GitHub sharing a row
  with a tall Steam card left a large dead gap under GitHub at every
  width. Replaced the shared grid with two independent flex columns
  (wide column for `"lg"` widgets, a stacked rail for everything else)
  — no shared row tracks, no gap. Also found and fixed a classic
  flex-truncation bug (`min-width: auto` using untruncated text width
  as a floor) once the sweep used a realistically long track title
  instead of only short placeholders. See `docs/DECISIONS.md` for the
  full trace — both were reproduced and fixed with real measurements,
  not guessed at.
- [x] **Stage 6 — Final review**: Lighthouse run against a real
  production build (`next build && next start`, not the dev server —
  confirmed dev mode alone was worth 33 performance points of
  difference on the identical page). Final: **Performance 98,
  Accessibility 100, Best Practices 96, SEO 100** — all meet the ≥95
  target. The one Best Practices point comes entirely from this
  sandbox's network restrictions blocking external CDN/favicon domains
  (verified by reading the actual audit detail), not a code issue.
  Code-quality sweep found no TODOs, no stray `any`, no orphaned
  exports. See `docs/DECISIONS.md` for the full self-review and a
  summary of all six stages.

**Hardening pass complete** (Stages 1–6, all on `dev`). Honest gaps,
named rather than glossed over at the time: no permanent automated test
suite existed in the repo (verification used the project's established ad
hoc Playwright-against-a-temporary-route pattern throughout, not a
committed suite), and cross-browser testing was Chromium-only (this
sandbox has no Safari/Firefox/real device access).

**Update (2026-07-27)**: the first gap is closed — see the "Automated
test suite" entry below. The second is unchanged and can't be closed from
this sandbox; it stays a real, named limitation (see `docs/DECISIONS.md`).

### Automated test suite (2026-07-27)

A committed Vitest + Playwright suite now runs in CI
(`.github/workflows/ci.yml`) on every PR, alongside lint/typecheck/
build — see `docs/DECISIONS.md` for scope and reasoning. Unit/component
tests live next to the code they cover in each package (`pnpm test`);
end-to-end tests live in `apps/web/e2e` (`pnpm --filter @pulse/web
test:e2e`).

### "Classical" redesign (2026-07-26): full visual system replacement

A design-tool export was supplied proposing a full visual replacement of
Liquid Glass — serif type (Cormorant Garamond/Lora), a flat paper
background, a single gold accent used only as strokes/borders, and
hairline dividers in place of blur/glow. This reverses the Hardening
pass's "do NOT redesign" decision above; per CLAUDE.md, that reversal was
flagged and explicitly confirmed before any code changed — see
`docs/DECISIONS.md`'s 2026-07-26 entry for the full reasoning.

Landed as one reviewable commit per surface (foundation tokens → shell →
Hero → Quick Launch → Spotify → Steam → GitHub → this doc pass), each
independently passing `pnpm build`/`lint`/`typecheck` per CLAUDE.md's
"finish one widget completely before starting the next." `docs/
DESIGN_SYSTEM.md` now describes Classical as canon (v2.0); `docs/
PROJECT_REFERENCE.md` §19 points at it. No new env vars were needed.

**Follow-up (2026-07-26)**: the live deployment surfaced a real bug (Hero
crashed in production — `useId()` called from a widget `render()` invoked
as a bare function call, not JSX) and several remaining fidelity gaps
against the mockup (status tag badges, Hero's kicker date line, GitHub's
metric count, Quick Launch's tile shape, nav links, Tasks/Notes "Coming
soon" cards). All fixed/closed — see `docs/DECISIONS.md`'s "Fix Hero's
production crash, close remaining redesign fidelity gaps" entry for the
full root-cause analysis and the one confirmed-deliberate deviation kept
(the grid layout).

### Notebook widget (2026-07-31)

Added a freeform "digital pocket notebook" widget: an untitled,
autosaving entry stream (`packages/widgets/notebook`), distinct from the
existing titled/editable Notes widget. No tags, folders, search, editing,
or deletion — typing pauses (~1s debounce) autosave the still-open entry
in place; clearing the input starts a new one. Entries render newest
first, capped to the last 10, grouped by relative day ("This morning" /
"Yesterday" / "Two days ago" / date), fading in opacity as they recede.
Size `"lg"`. Own `notebook_entries` Supabase table (same own-table
pattern Notes/Tasks established for user-authored content, as opposed to
the generic `widget_cache` JSON blob used for externally-fetched data) —
see `docs/DECISIONS.md`'s entry for the full reasoning, including the
`WidgetActionState.entryId` addition to `@pulse/sdk` that the autosave
upsert needed.

### Documentation accuracy pass (2026-08-01)

A status/bug audit found this doc and `docs/PROJECT_REFERENCE.md` had
drifted from actual shipped code — most notably still describing Tasks
as "skipped" and Phase 2 as "Not started" when Tasks/Notes/Notebook
write-back functionality was already live. Also, per explicit
instruction, **Calendar (Google), Email (Gmail), Focus timer, and
YouTube are permanently removed from Pulse's scope** — not deferred,
not backlog, never being built. Updated throughout both docs:

- `docs/PROJECT_REFERENCE.md` §9 (core widget list), §10 (backlog), §11
  (APIs needed), §12 (phase-by-phase roadmap), and §18 (success gates)
  all had references to these four removed.
- This doc's Phase 1 rescoped list and Phase 2 section (below) updated
  to reflect what's actually built.

The unrelated "Calendar (date display)" widget (plain local date text,
built 2026-07-24, later merged into Hero) is unaffected — it never was
the Google Calendar integration and was always a different, deliberately
separate thing; see that entry above.

## Phase 2 — make it actionable

**Partially shipped already, ahead of the formal Phase 1 gate** — a
request for Tasks, Notes, and Notebook (all write-back-to-own-table
features) directly, rather than waiting for two weeks of confirmed daily
Phase 1 usage first. Real status:

- [x] Task check-off with write-back — Tasks widget, own Supabase table,
  `/tasks` page
- [x] Freeform write-back content — Notes (titled, editable) and Notebook
  (untitled, autosaving stream) widgets, each with their own table and a
  full history page
- [ ] Habit check-ins logged to `habits` — not started; Habits is still
  just a "Coming soon" placeholder card

Focus-session start/stop (originally planned for this phase) was removed
along with the rest of the focus-timer target — see the "Documentation
accuracy pass" entry below.

## Phase 3 — personal analytics

Not started in its own right, though GitHub's streak computation
(current/longest, `packages/widgets/github/src/streaks.ts`) and the
separate Memory/Timeline milestone track (`docs/MEMORY_ROADMAP.md`) are
both early analytics-flavored work already underway outside this phase's
formal numbering.

## Phase 4 — publish (optional)

Not started, not committed to. A decision to revisit after Phase 3, not a
default next step.
