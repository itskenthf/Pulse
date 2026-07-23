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

1. [ ] Quote — static/rotating curated list, no external service
2. [ ] Quick launch — configurable shortcut links, no data source
3. [ ] Spotify — third OAuth provider, needs a Spotify Developer app

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
