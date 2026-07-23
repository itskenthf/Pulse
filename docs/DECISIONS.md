# Decisions

Record of architectural decisions and the reasoning behind them. Append new
entries at the bottom; don't rewrite history — if a decision changes, add a
new entry that supersedes it and say so.

## 2026-07-20 — Auth.js owns login/session; Supabase is Postgres-only

The project reference names both Auth.js (§3, for OAuth) and "Supabase (DB +
auth)" (§12, Phase 0). Supabase ships its own auth product, and running it
alongside Auth.js means two competing session/user models for the same
login — a real conflict, not just redundancy.

**Decision:** Auth.js (NextAuth v5) is the only auth system. It handles the
GitHub/Google/Spotify OAuth flows and issues its own session. Supabase is
used purely as the Postgres database — Supabase Auth is not enabled or used
anywhere. User identity is stored via `@auth/supabase-adapter`, which creates
its own `next_auth` schema (users, accounts, sessions, verification_tokens)
in the same Postgres database. All Pulse application tables
(`user_widgets`, `widget_cache`, etc.) key their `user_id` off
`next_auth.users.id`.

This keeps the tech stack table in the reference doc accurate (Auth.js
"handles Google, GitHub, Spotify login flows") while giving Supabase exactly
one job.

## 2026-07-20 — Turborepo over Nx

The reference doc leaves the monorepo tool choice open (§12). Turborepo was
picked over Nx: lighter configuration, first-party integration with Next.js
and Vercel (both used here), and it doesn't impose its own project-graph
conventions on top of a fairly simple package layout. Nx's extra power
(generators, richer dependency graph visualization) isn't needed for a
solo-maintained, ~10-package monorepo.

## 2026-07-20 — GitHub as the first OAuth provider

Phase 0's gate only requires logging in with "at least one provider."
GitHub was picked over Google as the first one to wire up: registering a
GitHub OAuth App is a two-minute form, while a Google Cloud Console OAuth
consent screen involves more setup (scopes, verification status, test
users). Google Calendar/Gmail OAuth is still added in Phase 1 per the
widget development order (§9) — this only affects which provider proves the
Phase 0 login flow.

## 2026-07-20 — Turborepo strict env mode requires explicit env var declarations

Turborepo 2.x defaults to strict env mode: environment variables are not
passed into a task's subprocess unless declared in that task's `env` array
in `turbo.json` (or global `passThroughEnv`). This silently broke the first
build attempt (`next build` saw `SUPABASE_URL` as undefined even though it
was exported in the shell). Fix: `turbo.json`'s `build` task explicitly
lists every env var the app reads. Any new env var a widget or adapter
introduces must be added there too, or `next build` will fail to see it —
this is a common trap worth remembering as OAuth providers are added in
Phase 1.

## 2026-07-20 — `@auth/supabase-adapter` requires the legacy `service_role` key, not the new `sb_secret_...` key

Supabase now issues two key formats: the new "Publishable/Secret" keys
(`sb_publishable_...` / `sb_secret_...`) shown by default in Settings → API
Keys, and the original "Legacy" `anon`/`service_role` JWT-style keys under a
separate tab. `@auth/supabase-adapter` was built against the legacy format —
using the new `sb_secret_...` key for `SUPABASE_SERVICE_ROLE_KEY` caused
every adapter call (creating the user record on first sign-in) to fail with
a generic, undiagnosable `AdapterError`. No outgoing request even appeared
in Vercel's function logs, suggesting the client-construction step itself
was silently misbehaving rather than getting a normal HTTP rejection.

**Decision:** `SUPABASE_SERVICE_ROLE_KEY` must be the legacy `service_role`
JWT (starts with `eyJ...`, found under Settings → API Keys → "Legacy anon,
service_role API keys"), not the new `sb_secret_...` key, until
`@auth/supabase-adapter` confirms support for the new format. This only
affects the adapter's own env var — `packages/database`'s
`createServiceClient()` (used directly by our own code, not by the adapter)
hasn't been tested against the new key format and may or may not have the
same issue; revisit if/when that client is actually used by a widget's
fetch job in Phase 1.

Two other things were fixed alongside this before the login gate passed,
neither of which turned out to be the root cause but are worth keeping in
mind:
- Supabase's Data API only serves schemas listed under Settings → Data API →
  "Exposed schemas." `next_auth` (the adapter's schema) must be added there
  — it isn't by default, only `public` and `graphql_public` are.
- Stale PKCE cookies from earlier failed sign-in attempts (especially across
  different domain aliases of the same Vercel project) can cause a separate
  `invalid_grant` / "code_verifier did not match" error. Testing in a fresh
  incognito window avoids this. Also: pin the app to exactly one domain —
  `AUTH_URL`, the GitHub OAuth App's URLs, and the browser URL used for
  testing must all match exactly, including which of a project's multiple
  `*.vercel.app` aliases is used.

## 2026-07-20 — GitHub Actions as the scheduler, not Vercel Cron

The reference doc wants weather refreshed every 30-60 min (§4), but
Vercel's Hobby (free) tier only allows cron jobs to run once per day —
building a Vercel Cron for this would silently not deliver the refresh
interval the doc asks for. §5 explicitly anticipates swapping schedulers
("swap Vercel Cron for GitHub Actions, say") without touching any widget,
so this isn't a deviation from the architecture, just exercising the
flexibility it already designed in.

**Decision:** `.github/workflows/refresh-widgets.yml` runs every 30 min and
calls `GET /api/cron` with a bearer token (`CRON_SECRET`, checked in the
route handler). The route iterates every user in `next_auth.users` and
every registered widget, calling `fetchData()` + writing `widget_cache` for
each. Requires two things set outside the codebase: `CRON_SECRET` as a
Vercel env var (same value the route checks against) and as a GitHub
Actions repo secret, plus a `PULSE_URL` repo variable pointing at the
deployed app. If Pulse ever moves to Vercel Pro, this can be swapped for
native Vercel Cron by pointing `vercel.json` at the same route — the route
itself doesn't care who calls it, only that the bearer token matches.

## 2026-07-20 — Widget SDK gained `actions` (render props) and `parseSettingsForm`

Building the first real widget (weather) surfaced a real gap: a widget's
`render()` needs a way to trigger a refresh or save settings, but a widget
package can never import `apps/web`'s server actions or auth logic without
inverting the dependency graph (`apps/web` depends on widget packages, not
the reverse).

**Decision:** the shell constructs generic, already-bound server actions
(session lookup + cache/settings writes happen in `apps/web`, not in the
widget) and passes them into `render()` via a new `actions` prop
(`WidgetRenderProps.actions: { refresh, updateSettings? }`). Widgets stay
fully decoupled from auth/data-layer mechanics — they just call the action
they're handed. A new optional `parseSettingsForm?(formData): TSettings`
was added to the `Widget` interface so each widget still owns validating
its own settings input, while the shell's settings-save action stays
generic (works for any widget that defines it, doesn't special-case
weather). This is the "improve the SDK after every completed widget"
principle (reference doc §13) applied literally — done during the first
widget because the gap was real, not speculative.

A related fix: `Widget`'s default `TSettings` changed from
`Record<string, never>` (unusable — allows no real properties) to
`Record<string, unknown>`, and `registerWidget`/`getAllWidgets` needed to
become generic rather than collapsing every widget to that default,
otherwise a widget with a concrete settings type couldn't be registered at
all (a real TypeScript variance error caught while wiring weather, not a
hypothetical one).

## 2026-07-20 — `service_role` needs explicit GRANTs on tables created via raw SQL

Every table in `0001_core_schema.sql` was created by running SQL directly
in Supabase's SQL Editor. That's different from creating a table through
Supabase's Table Editor UI, which quietly applies a standard set of grants
(to `anon`, `authenticated`, `service_role`) as part of its own tooling.
Raw SQL doesn't get that — ownership goes to `postgres`, and no other role
has any access until explicitly granted. This surfaced as
`permission denied for table widget_settings` from `service_role` itself,
which is surprising at first since `service_role` is supposed to bypass
RLS unconditionally — but this wasn't an RLS rejection (Postgres phrases
those as "new row violates row-level security policy"), it was a plain
missing GRANT, a layer below RLS entirely.

**Decision:** `0002_grant_service_role.sql` grants `service_role` full
access to all tables/sequences/routines in `public`, plus sets default
privileges so tables created by *future* migrations don't need this
repeated. Anyone applying migrations by hand (SQL Editor rather than the
Supabase CLI) needs to run every migration file, including this one — it's
easy to assume `service_role` "just works" and skip straight to writing
app code against a new table.

## 2026-07-20 — Clock widget renders client-side instead of using widget_cache

Every widget so far follows fetch → cache → render on a cron/manual-refresh
cycle. A live clock can't work that way: caching "the current time" and
refreshing it every 15-30 minutes would display a frozen, increasingly
wrong time between refreshes, defeating the entire point of a clock.

**Decision:** `packages/widgets/clock`'s `render()` returns a client
component (`clock-display.tsx`, `"use client"`) that ticks every second
using the browser's own clock via `setInterval`, entirely bypassing
`widget_cache` for the actual displayed value. `fetchData()` still exists
(the `Widget` interface requires it) but does nothing beyond
`ensureWidgetRegistered` — there's no real external data source. The only
thing that goes through the normal settings pipeline is the user's
timezone/12h-vs-24h preference. This is the first widget where "fetches
real data" (§7 definition of done) is satisfied only nominally; treating
that DoD item as strictly mandatory for every future widget would be wrong
— some widgets (a clock, a quick-launch link list) legitimately have
nothing to fetch.

## 2026-07-22 — GitHub widget scoped down to contributions, reusing the login token

The original build-order description (§9) frames the GitHub widget as
"current project — commits, open PRs." Implementing that as planned would
have needed the `repo` OAuth scope (broad — "full control of private
repositories" on the consent screen) and a re-authorization prompt at next
login, since the login provider's default scope only covers profile/email.

**Decision, at Ken's request:** scope it down to contribution counts
(today/this-week/this-year) plus a 12-week mini heatmap via GitHub's
GraphQL `contributionsCollection` instead. This needs only `read:user`,
which the existing login token already has — no scope change, no
re-authorization, no settings UI at all (contributions are account-wide).
`packages/database/src/accounts.ts` (`readProviderAccessToken`) was added
as the reusable way for any widget to read a stored login-provider token;
Spotify and any future GitHub-repo-specific widget will reuse this same
`next_auth.accounts` read pattern rather than requiring their own OAuth
plumbing where the login provider's token already covers it.

## 2026-07-22 — Steam widget pulled forward from the §10 backlog

The reference doc's own sequencing note (§10, §20) says not to build
backlog widgets until the core 12 are in daily use. Ken asked for Steam
specifically (recently played games) ahead of that. Judged as a
reasonable exception rather than a process break: Steam requires no OAuth
(API key + a public SteamID64), so it doesn't compete for scarce
OAuth/consent-screen effort the way Calendar/Spotify do, and the doc's own
principle (§13: "every new feature must justify its maintenance cost")
is about avoiding low-value scope creep, not about rigid ordering — a
widget Ken will actually use daily clears that bar regardless of its
position in §9's list. `packages/adapters/steam` + `packages/widgets/steam`
follow the exact weather-widget shape (adapter owns the HTTP call, widget
owns fetch/cache/settings/render).

## 2026-07-22 — Phase 1 rescoped: Tasks, Focus timer, Habits, Email, YouTube dropped

After 5 widgets shipped, Ken reviewed the remaining build order (§9) and
concluded several of the planned widgets don't fit how he actually wants
to use Pulse long-term: Tasks (doesn't use any task tool), Focus timer,
Habits, Email, and YouTube. Calendar stays in its existing deferred state.

**Decision:** these are dropped from *active* scope, not removed from the
codebase or the reference doc — the architecture doesn't care what order
widgets are built in (each is an isolated package), so reviving any of
them later costs nothing beyond the widget's own build time. This is
exactly the reference doc's own philosophy applied honestly (§13:
"optimize for daily usability, not feature count"; "every new feature must
justify its maintenance cost") — a complete checklist of unused widgets
would be worse than a smaller set of widgets actually checked daily.
Remaining active Phase 1 target: **Quote → Quick launch → Spotify**, in
that order (two zero-setup widgets first, the OAuth-requiring one last).
See `docs/ROADMAP.md` for the full rationale per dropped widget.

## 2026-07-23 — Quote widget: curated themes, no attribution, no quote API

Ken explicitly rejected generic motivational quotes and a live quote API,
picking 7 specific themes instead (coffee, dev humor, gaming, minimalism,
relationship, programming, stoicism) and asking for no author names shown
at all — kept deliberately minimal.

**Sourcing, for the record** (not shown in the UI, but worth documenting
since the quotes were hand-picked rather than pulled from a verified
source): Stoicism and Programming entries are real, well-documented
quotes from real people. Gaming entries are real lines from real games.
Coffee and Developer-humor entries mostly circulate as anonymous internet
folklore with no verifiable original author, so none of those were pinned
on a specific real person. A couple of well-known but disputed
attributions (e.g. the "simplicity is the ultimate sophistication" line
often wrongly credited to Leonardo da Vinci) were deliberately left out
rather than repeated. Since no attribution renders in the UI, this is
purely an internal accuracy note for whoever edits `quotes.ts` later.

**Decision:** static list in `packages/widgets/quote/src/quotes.ts`
(~40 quotes), each tagged with a `category` field for future filtering
even though no settings/filter UI exists yet — free to add since it's
just a data label already known at authoring time, not speculative
infrastructure. `fetchData()` picks randomly on every call (cron and
manual refresh both rotate it), skipping an immediate repeat of the
previous cached quote.

## 2026-07-23 — Spotify widget: custom OAuth connect flow, not a NextAuth provider

Spotify is Pulse's third OAuth-backed integration, and the first one that
isn't also the login provider — you're already signed in via GitHub, and
need to *separately* authorize Spotify and have that connection attach to
your existing account, not create a second disconnected user. Auth.js
doesn't have a first-class "link an additional provider to the currently
signed-in user" flow; getting this right through NextAuth's own
`signIn`/adapter callbacks would mean depending on account-linking
behavior in a beta library (`next-auth@5.0.0-beta.31`) that isn't clearly
documented for this exact case — a real risk of silently creating a
duplicate user or linking the wrong account.

**Decision:** Spotify is *not* registered as a NextAuth provider at all.
Instead, two plain route handlers own the whole flow end to end:

- `GET /api/connect/spotify` — requires an existing Pulse session, sets a
  short-lived signed state cookie (CSRF protection), redirects to
  Spotify's own `/authorize` endpoint with `user-top-read` scope (read-
  only, no playback control).
- `GET /api/auth/callback/spotify` — verifies the state cookie, exchanges
  the code for tokens directly against Spotify's token endpoint
  (`packages/adapters/spotify`), fetches the Spotify profile id, and
  writes the tokens into `next_auth.accounts` itself via
  `upsertProviderAccount()` (`packages/database`) — the same table
  Auth.js's adapter uses for GitHub, but written to directly rather than
  through the adapter. Because this all happens in one browser round trip,
  the Pulse session cookie is still present when the callback fires, so
  `auth()` reliably identifies which user is connecting — no separate
  state-to-user mapping needed.

This callback route deliberately lives at `/api/auth/callback/spotify` —
under next-auth's own path — purely so the redirect URI registered in the
Spotify dashboard matches what a NextAuth provider would have used; it has
nothing to do with next-auth's `[...nextauth]` catch-all route, and Next.js
correctly resolves the specific segment ahead of the catch-all (confirmed:
both appear as separate routes in the build output).

**Token refresh** is handled in the widget's own `fetch.ts`, not the
adapter's connect flow: Spotify access tokens expire in ~1h, shorter than
the 30 min scheduler interval is forgiving of only by luck, so every fetch
checks expiry (with a 60s safety margin) and calls
`refreshAccessToken()` + re-persists via `upsertProviderAccount()` before
fetching top tracks if needed. If refresh fails or no refresh token is
stored, `fetchData()` returns `{ connected: false }` — a valid data state,
not a thrown error — so the widget's render() can show a "Connect Spotify"
button distinctly from a generic error banner.

**Scope note:** the `/api/connect/spotify` and `/api/auth/callback/spotify`
routes are Spotify-specific, not a generic `/api/connect/[provider]`
mechanism. Generalizing now would be premature — only one widget needs
this pattern. If a second custom-OAuth widget is ever added, extract the
shared parts then, not speculatively now.
