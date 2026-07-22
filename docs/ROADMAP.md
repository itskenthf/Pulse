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
- [x] Deployed to Vercel (`https://pulse-plum-seven.vercel.app`)
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
   Needs `CRON_SECRET` set in Vercel and as a GitHub Actions secret, plus a
   `PULSE_URL` repo variable, before the scheduler actually runs — see
   README.
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
6. [ ] Tasks
7. [ ] Email (Gmail readonly)
8. [ ] Focus timer (first write-back)
9. [ ] Habits
10. [ ] Spotify (third OAuth provider)
11. [ ] YouTube
12. [ ] Quick launch

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
