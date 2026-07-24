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
`hero`. **Note for Ken:** the previous Greeting/Weather widget settings
(name, time zone, location) don't carry over automatically since Hero is a
new widget id — reconfigure them once via the Hero banner's own Settings
after this deploys.

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
