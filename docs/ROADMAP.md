# Roadmap

Full phase definitions and gates live in `docs/PROJECT_REFERENCE.md` §12
and §18 — this doc tracks live status against them.

## Phase 0 — setup

- [x] GitHub repo, monorepo tool decided (Turborepo — see `docs/DECISIONS.md`)
- [x] Next.js app scaffolded in `apps/web`
- [x] Widget SDK contract defined (`packages/sdk`)
- [x] Auth.js wired with GitHub as first provider
- [x] Core DB schema migrations written (`supabase/migrations/`)
- [x] Supabase project created
- [x] GitHub OAuth App registered
- [x] Deployed to Vercel (`https://[redacted-old-domain]`)
- [x] **Gate:** log in with GitHub, see your own name echoed back — confirmed

**Phase 0 is complete.**

## Phase 1 — MVP (read-only dashboard)

In progress. Per the reference doc's widget development order (§9):

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
4. [~] Calendar (first OAuth widget — Google) — **deferred by Ken**: needs
   Google Cloud Console setup time (consent screen, test users, scopes).
   Skipped ahead to GitHub; revisit when there's time for the manual setup.
5. [x] GitHub — `packages/widgets/github` + `packages/adapters/github`:
   contribution counts (today / this week / this year) plus a 12-week mini
   heatmap, via GitHub's GraphQL `contributionsCollection`. Scoped down
   from the original "commits + open PRs" concept at Ken's request — kept
   deliberately simple. Reuses the login token from `next_auth.accounts`
   (`readProviderAccessToken` in `packages/database`) — no scope change,
   no second OAuth flow, no settings. Establishes the "widget using the
   login provider's token" pattern that Spotify/Google widgets will follow.

Also shipped, pulled forward from the §10 backlog at Ken's request:

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

Ken reviewed the remaining build order and decided the following aren't
useful to him long-term — dropped from active scope, not deleted from the
plan; trivial to revive later since nothing about the architecture depends
on building them in order:

- [~] Tasks — skipped, doesn't track tasks in any tool
- [~] Email (Gmail readonly) — blocked behind the same Google Cloud setup
  as Calendar anyway
- [~] Focus timer — dropped
- [~] Habits — dropped
- [~] YouTube — blocked behind Google Cloud setup, dropped
- [~] Calendar (Google) — stays deferred, revisit if/when there's time for
  the Google Cloud Console setup

**Remaining active target for Phase 1**, in the order Ken wants them:

1. [x] Quote — `packages/widgets/quote`: ~40 hand-curated quotes across 7
   themes Ken picked (coffee, dev humor, gaming, minimalism, relationship,
   programming, stoicism) — deliberately not generic motivational quotes,
   and no attribution shown (kept minimal per Ken's request; see
   `docs/DECISIONS.md` for sourcing notes on the ones with real quotes
   behind them). No adapter — static local data. Picks a random quote on
   every `fetchData()` call (cron *and* manual refresh both rotate it,
   avoids repeating the immediately-previous pick) rather than locking to
   one quote per calendar day, so the "Shuffle" button is actually useful.
   A second clean confirmation of the normal fetch → cache → render
   pattern, alongside Clock's deliberate exception to it.
2. [x] Quick launch — `packages/widgets/quick-launch`: up to 6
   label+URL shortcut links, plain text (no favicons, per Ken's minimal
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

**Also added, beyond the rescoped 8, at Ken's request:**

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

Following the two-tone card redesign, Ken asked for the Greeting, Weather,
and Quote cards to become one full-width hero banner above the grid
(`packages/widgets/hero`) instead of three separate cards — see
`docs/DECISIONS.md`. `packages/widgets/greeting`, `packages/widgets/weather`,
and `packages/widgets/quote` were deleted (their logic now lives inside
`hero`); `packages/adapters/weather` is unchanged and reused directly by
`hero`. (Superseded by the next entry below — Hero no longer has a Settings
panel at all.)

### Redesign v2 (2026-07-24): light-blue theme, Clock/Calendar into Hero, graphs, icon refresh

Same-day follow-up after Ken reviewed the live redesign above. Changes:

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
  setting — Ken asked for this to "just work" with no configuration step.
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

Ken reviewed the light-blue redesign live and judged it "functional but
not achieving the intended experience" — an admin-panel feel, flat, weak
hierarchy, unfinished-looking. He provided a full authored design system
doc (now `docs/DESIGN_SYSTEM.md` in its entirety) and asked for a genuine
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

Ken judged the Liquid Glass redesign "a major improvement" but flagged
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
  bottom-center glass dock — Ken's explicit ask after judging the rail
  "disconnected." Tablet drawer and mobile bottom nav unchanged.
- Radius/motion consistency audit across nav chrome (a couple of
  `rounded-lg` outliers bumped to the same `rounded-xl` used everywhere
  else).
- Spotify's "now playing" emphasis treatment and the commit-signature stop
  hook were explicitly out of scope for this pass, per Ken's instruction.

### Follow-up polish (2026-07-24): reference-matched gradient, denser cards, Steam achievements, icon-only Quick Launch

Ken shared a reference screenshot and asked for the background/cards to
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

**Gate to move on:** the Phase 1 success gates in the reference doc §18 —
daily use for two consecutive weeks, trusted data, at least one widget
replacing a separately-checked tool.

## Phase 2 — make it actionable

Not started. Blocked on Phase 1 gate.

## Phase 3 — personal analytics

Not started. Blocked on Phase 2 gate.

## Phase 4 — publish (optional)

Not started, not committed to. A decision to revisit after Phase 3, not a
default next step.
