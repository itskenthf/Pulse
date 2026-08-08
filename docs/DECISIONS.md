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

**Decision, by explicit request:** scope it down to contribution counts
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
backlog widgets until the core 12 are in daily use. Steam was requested
specifically (recently played games) ahead of that. Judged as a
reasonable exception rather than a process break: Steam requires no OAuth
(API key + a public SteamID64), so it doesn't compete for scarce
OAuth/consent-screen effort the way Calendar/Spotify do, and the doc's own
principle (§13: "every new feature must justify its maintenance cost")
is about avoiding low-value scope creep, not about rigid ordering — a
widget that will actually see daily use clears that bar regardless of its
position in §9's list. `packages/adapters/steam` + `packages/widgets/steam`
follow the exact weather-widget shape (adapter owns the HTTP call, widget
owns fetch/cache/settings/render).

## 2026-07-22 — Phase 1 rescoped: Tasks, Focus timer, Habits, Email, YouTube dropped

After 5 widgets shipped, the remaining build order (§9) was reviewed and
several of the planned widgets were concluded not to fit actual long-term
use of Pulse: Tasks (doesn't use any task tool), Focus timer,
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

Generic motivational quotes and a live quote API were explicitly rejected,
in favor of 7 specific themes instead (coffee, dev humor, gaming, minimalism,
relationship, programming, stoicism), with no author names shown
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

## 2026-07-25 — Fix: Tailwind v4 wasn't scanning any workspace package

**Every widget rendered with default browser styles in production** —
no rounded corners, no borders, no dark mode, nothing — despite the code
correctly using Tailwind classes throughout `packages/ui` and every
`packages/widgets/*` component. Confirmed by grepping the built CSS:
classes used only in the shell (`apps/web/src/app/page.tsx`, e.g.
`rounded-md`) were present, but classes used only inside a widget package
(`rounded-xl` from `WidgetCard`, `tabular-nums` from the clock display,
`emerald-*` from the GitHub heatmap) were completely absent.

**Root cause:** Tailwind v4's automatic source detection explicitly skips
anything under a `node_modules` directory. In a pnpm workspace, every
`@pulse/*` package is consumed through a `node_modules` symlink — even
though the real, editable `.tsx` source lives in `packages/*`, not a build
artifact — so Tailwind's scanner never saw it. This had been silently
broken since the very first widget (weather) and went unnoticed because
the *shell's own* Tailwind classes (sign-in button, layout) always worked
fine, making the page look "styled enough" at a glance without close
inspection — the failure was invisible in isolation, only obvious once
directly compared against the intended design.

**Decision:** added explicit `@source` directives to
`apps/web/src/app/globals.css` pointing at `packages/ui/src` and
`packages/widgets/**`, forcing Tailwind to scan them regardless of the
`node_modules` heuristic. Verified two ways: grepped the built CSS for the
four previously-missing classes above (all now present), and rendered
Weather/GitHub/Clock's real components with mock data on a temporary route
to visually confirm cards actually show rounded corners, borders, and
correct spacing — then deleted that route before committing (verification
artifact, not part of the app).

**Anyone adding a new widget package should be aware this class of bug can
recur**: if a brand-new *directory* is added under `packages/widgets/` or
`packages/ui` that doesn't match the existing `@source` globs (e.g. a
differently-nested structure), its classes would silently drop out of the
build the same way, with no error — only a visually broken/unstyled
result. Worth a quick visual check after adding any new package with
Tailwind classes, not just a green typecheck/build.

## 2026-07-24 — Redesign: two-tone cards, adapted from a user-provided reference

**Context:** user shared an "iDraft" dashboard mockup as the interface
direction for Pulse's Phase 1 redesign: bold two-tone black/white cards,
large rounded corners, soft shadows, a decorative background texture, and
a sidebar nav. Reference doc §19 specifies a flatter Arc/Raycast/Linear
style ("no gradients or heavy shadows") — a real tension, surfaced to the
user before implementing rather than silently picking one.

**Decision:** adopt the reference's two-tone cards, bolder radius
(`rounded-2xl`), and a soft shadow, since those don't structurally
conflict with §19's "one reusable card, consistent everywhere" rule — they
just make that one card bolder. Deliberately drop the background texture
and sidebar nav: Pulse is a single-page dashboard shell (`apps/web`'s
`page.tsx`), not a multi-view app, so a sidebar has nothing to navigate
between; decorative background texture is exactly the "heavy decoration"
§19 rules out and doesn't survive contact with dark mode or mobile widths
cleanly. Confirmed with the user before implementing.

**Implementation:** `WidgetCard` (`packages/ui/src/widget-card.tsx`) gained
a `tone?: "default" | "accent"` prop — deliberately kept out of
`packages/sdk`'s `Widget` interface since it's a per-widget visual choice,
not part of the data contract. `"accent"` inverts to the opposite end of
the zinc scale from whichever color scheme is active, so the "dark" card
stays dark in both light and dark mode instead of collapsing into the page
background. Applied `tone="accent"` to Greeting, Clock, and Quote (3 of 9
widgets) to echo the reference's mostly-light-with-a-few-dark-cards
balance. `ActionForm`'s button switched from hardcoded zinc colors to
`border-current`/`text-current`/`hover:bg-current/10` so it automatically
reads correctly inside either tone without its own tone prop. Widget body
text switched to `text-current` for the same reason. Also fixed the body
font, which had been hardcoded to Arial since the original create-next-app
scaffold despite Geist Sans already being loaded and unused.

**Responsive verification:** screenshotted the real `WidgetCard`/
`ActionForm` components (mock data, on a temporary route deleted before
committing) at phone (390px), tablet (820px), and desktop (1440px)
viewports, in both light and dark mode, via a Playwright script
(`chromium-cli` wasn't available in this environment — see the run skill's
documented fallback). Single column on phone, 2-column on tablet, 3-column
on desktop; header wraps cleanly on narrow widths. `apps/web/src/app/page.tsx`
picked up `flex-wrap` on the header and responsive padding (`p-4 sm:p-6`)
for the phone case.

## 2026-07-24 — Redesign v2: white cards + blue gradient, and a merged Hero banner

**Context:** after the two-tone black/white redesign shipped (previous
entry, same day), the user reviewed the live deployment and a second design
reference (a light-blue admin dashboard mockup) and asked for two changes:
(1) all cards white instead of the black "accent" tone, with the reference's
light-blue gradient background and card style; (2) Greeting, Weather, and
Quote combined into a single hero paragraph above the grid instead of three
separate cards, e.g. "Good Morning / Today / 29°C Cloudy / Continue
working on Pulse / Quote / '...'".

**Color/background decision:** straightforward — reverted `WidgetCard`'s
`tone` prop entirely (nothing needed it once Greeting/Quote were folded into
Hero and Clock's accent tone was dropped), added a light-blue gradient to
`apps/web/src/app/page.tsx`, and gave each card's icon a small colored badge
circle (`bg-sky-100`/`text-sky-600`, dark equivalents) echoing the
reference's icon-badge treatment. Kept to one accent color rather than the
reference's varied palette, for minimalism.

**Hero banner decision:** merging three widgets' data into one piece of
prose outside the card grid means *something* has to know about all three
by name and stitch their data together — a real conflict with "the shell
never contains widget-specific business logic" (CLAUDE.md, ARCHITECTURE.md).
Flagged this to the user before implementing and offered three options: (a)
a new dedicated widget that aggregates the three data sources itself, so the
shell still only ever calls generic `render()`; (b) the shell reading
Greeting/Weather/Quote's cache by id and composing the paragraph directly;
(c) keep them as separate cards, just reordered to the top. User picked (a).

**Implementation:** added `"hero"` to `WidgetSize` in `packages/sdk` (was
`"sm" | "md" | "lg"`, previously unused by the shell for layout — now
actually branches on it). `apps/web/src/app/page.tsx`'s `WidgetGrid` splits
rendered widgets into `heroItems` (rendered full-width, chromeless, above
the grid) and `cardItems` (rendered inside the existing responsive grid) —
driven entirely by the generic `size` field, not a hardcoded widget id, so
the shell still only depends on `@pulse/sdk`'s `Widget` interface.

Built `packages/widgets/hero`: its `fetch.ts` reuses `@pulse/adapter-weather`
directly (adapters are meant to be reused across widgets) and inlines the
greeting time-of-day logic and the quote list/pick logic, rather than
importing from the old Greeting/Quote widget packages — those packages'
whole reason to exist was their card UI, which Hero doesn't use, and their
computation is small enough that duplicating it here beats keeping three
now-largely-dead packages around as import sources (CLAUDE.md: no
premature abstraction, delete rather than accumulate). `packages/widgets/greeting`,
`packages/widgets/weather`, and `packages/widgets/quote` were deleted
outright — not deprecated, not kept as dead code — since every line of
their UI is superseded by Hero and nothing else referenced them.
`packages/adapters/weather` is untouched and still in use, just from Hero
instead of a dedicated `weather` widget.

**Known side effect:** Hero is a new widget id (`hero`), so the previous
Greeting/Weather widget settings (name, time zone, location) in
`widget_settings` don't carry over — they're orphaned rows under the old
`greeting`/`weather` widget ids. The user needs to reconfigure name/location
once via Hero's own Settings panel after this deploys. Defaulted Hero's
location to Kuching (matching the user's already-known location from the
original Weather widget setup) to minimize the reconfiguration needed.

## 2026-07-24 — Redesign v3: light-blue only, Hero absorbs Clock/Calendar, real graphs, icon refresh

**Context:** after redesign v2 shipped (previous entry), several further
changes were requested, each with a real tradeoff worth recording:

**1. Dark mode.** Light-blue only was requested, matching the design reference
exactly. This is a direct exception to reference doc §7's "dark mode
support" line in the definition of done. Flagged this before touching
anything, since CLAUDE.md requires explaining + explicit approval before
contradicting the reference doc. Given the choice between deleting all
`dark:` classes (matches the ask exactly, but throws away something already
working and correctly styled) versus keeping them as an unmaintained
fallback (costs nothing to leave in place, protects anyone who hits Pulse
in OS/device dark mode from a broken/blinding page), the decision was to keep the
fallback. §7 amended: dark mode support means "doesn't break," not
"equally designed" — light-blue is the only theme that gets actual design
attention going forward.

**2. Hero absorbs Clock and Calendar.** Extends the same-day Hero merge
(previous entry) to also fold in the two remaining "simple info" widgets.
`packages/widgets/clock` and `packages/widgets/calendar-date` deleted;
their date-line + live-ticking-time display moved into
`packages/widgets/hero/src/hero-clock.tsx` (a small `"use client"`
sub-component, same ticking pattern the old Clock widget used) and
`fetch.ts` (date string, computed server-side per fetch). No architecture
conflict here — Hero already established the "one widget can own several
merged concerns internally" pattern in the previous entry.

**3. No settings, fetch automatically.** Real tradeoff by field:
- **Name**: solved cleanly — `readUserName()` (new helper in
  `packages/database/src/users.ts`) reads `next_auth.users.name`, which
  Auth.js already populated from the GitHub OAuth profile at login. Zero
  new setting, zero new UI, genuinely automatic.
- **Time zone / weather location**: there's no clean "automatic" for a
  server-rendered, cron-fetched dashboard without adding either a browser
  permission prompt (geolocation — not silent) or a new IP-geolocation
  adapter (silent, but only city-accurate, and net-new external dependency
  for a problem that doesn't really exist for a single, fixed-location
  user). These tradeoffs led to the simplest option being chosen:
  hardcoded constants in `packages/widgets/hero/src/constants.ts`
  (`Asia/Kuching`, and Kuching's lat/long — matching what was already
  configured on the old Weather widget). This is a deliberate, scoped
  exception to §7's "settings support" requirement, not a general pattern —
  amended §7 to note it explicitly rather than silently dropping the
  requirement everywhere.

**4. Real graphs, not fake ones.** Loaded the `dataviz` skill before
building any chart. Followed its form-first method: Steam's playtime is
genuine magnitude data across a handful of games → horizontal bar chart is
the correct form (not a pie, not a donut), single sequential hue since the
bars encode magnitude, not identity — no legend needed for one series. Bar
spec follows the skill's mark rules: thin (8px) marks, rounded only at the
data-end (the tip, not the baseline), value labeled directly at the tip
instead of requiring hover, unfilled track as a lighter step of the same
ramp (the "meter" pattern). GitHub's contribution heatmap was already the
right form for that data — just recolored from green to the same blue
ramp for theme consistency, no structural change.

Investigated Spotify for the same treatment (the original ask mentioned
"any widget with numbers") and confirmed via the adapter code that
Spotify's public Web API doesn't expose play counts or cumulative listening
time on the top-tracks endpoint — that data only exists inside
Spotify-internal products (Wrapped) with no public API. Rather than
inventing a number to chart, Spotify intentionally keeps its plain ranked
list. Flagged this rather than building something that looks like data but
isn't.

**5. Icon-only refresh button.** `ActionForm` (`packages/ui`) gained a
`variant?: "text" | "icon"` prop rather than a blanket change — "Refresh"
across every widget switches to a minimal circular-arrow SVG button
(`aria-label`/`title` carry the accessible name), while "Save" (settings
forms) keeps the text variant, since that's a distinct, deliberate action a
user takes after filling out a form and benefits from a clear label.

## 2026-07-24 — Redesign v4: masonry layout, sidebar returns, card accents, warmer copy

**Context:** the live deploy was reviewed and two things reported beyond
the specific asks below: the Hero banner appeared to be missing, and the
page felt too empty. On investigation, Hero itself is correctly registered
and shipped (PR #17) — the most likely explanation is that `hero` is a
brand-new `widget_cache` row (the old `greeting`/`weather`/`quote`/`clock`/
`calendar-date` ids don't carry over), so until the next cron run or a
manual refresh, `data` is `null` and only the "Hello" fallback headline and
tagline render — everything else in Hero is gated on `data &&`. Not a bug,
but a real first-load gap worth knowing about; a manual refresh on the
banner fixes it immediately.

**1. Masonry-style layout.** The previous `grid grid-cols-1 sm:grid-cols-2
lg:grid-cols-3` lays out cards in uniform rows — a short card (Quick
Launch) leaves visible empty space below it if its row-mate (Steam) is
taller. Switched to CSS multi-column (`columns-1 sm:columns-2
lg:columns-3`, each card `mb-4 break-inside-avoid`) — genuine masonry-style
packing without a JS library. (True CSS Grid `masonry` track sizing exists
in spec but isn't broadly supported across browsers yet, so multi-column is
the practical choice.)

**2. Sidebar reverses an earlier decision.** The 2026-07-24 redesign-v3
entry (and reference doc §19) explicitly ruled out a sidebar nav, reasoning
Pulse is a single-page app with nothing to navigate between. A direct
request came in for one back, as a placeholder for future sections — this is new,
explicit direction, not a silent contradiction, so implemented without
further back-and-forth (still flagged as a reversal here per CLAUDE.md's
spirit of recording real architectural decisions with reasoning). Built as
a 64px icon rail: "Dashboard" is the only real, active item; "Tasks" and
"Habits" are visibly disabled with a "coming soon" title and no `href` —
UI signposting, not scaffolded feature infrastructure (no new routes, no
new DB tables, no backend logic) — keeps faith with the project's
"don't scaffold future features ahead of need" rule while still delivering
the requested visual placeholder.

**3. Card accents.** "Every widget is white" — added `WidgetCard`'s
`accent?: "blue" | "green" | "indigo" | "none"` prop, a `border-l-4` colored
left border rather than recoloring the whole card (keeps the light-blue
theme's restraint). Assigned by feel where not specified exactly:
GitHub blue (matches its existing icon badge), Spotify green (nods to
Spotify's own brand color), Steam indigo (a distinct darker blue). Left
Quick Launch unaccented rather than inventing a color with no rationale.
The original list also named "Weather" (sky gradient) and "Calendar" (purple) —
both no longer exist as separate cards, having been folded into Hero in
the v3 redesign. Rather than resurrecting them as cards (which would undo
that merge), applied the same "give it a color" intent to Hero's internal
sections instead: the weather line sits in a sky-gradient chip, the
date/time line gets a small violet accent dot.

**4. Profile menu + greeting copy.** Replaced the "Signed in as X / Sign
out" text row with a `<details>`-based dropdown pill (avatar from the
GitHub OAuth profile image if present, else an initial-letter badge),
containing a disabled "Settings" placeholder and the real "Sign out" —
addresses the specific "feels like an admin dashboard" critique. Built as
`<details>`, not a `useState` client component, so the header stays a
server component. Hero's date line shortened from the full
"Friday, July 24, 2026" to "Friday · 24 July," and the flat tagline
"Continue working on Pulse" became "Continue where you left off." — two
alternative greeting styles were given as examples; this keeps the first
one's headline+date structure (already in place) and borrows the second
one's warmer tagline phrase, rather than picking one wholesale.

## 2026-07-24 — New design system spec adopted: Liquid Glass, not light-blue flat

A complete, authored `docs/DESIGN_SYSTEM.md` was provided, replacing the
incrementally-built one from the four redesign passes earlier today. It's a
real direction change, not an extension: glass materials (light/medium/heavy
blur variants), a soft-neutral (never pure white) background instead of the
sky-blue gradient, spring-based motion, an 8px spacing scale, a defined
radius/typography/shadow scale, `accent` colors restricted to icons/indicators
only ("avoid full colored cards" — a stricter rule than today's `WidgetCard`
`accent` left-border, which is still a colored *card* element), a component
architecture named around `Glass*` primitives (`GlassCard`, `GlassPanel`,
`GlassButton`, `GlassNavbar`, `GlassSidebar`), and Lucide as the standard
icon set (every widget currently hand-rolls its own inline SVG icons).

**Current implementation does not yet match this doc.** Today's four
redesign passes (see the four entries above) built a light-blue flat theme
with `backdrop-blur-sm` used sparingly, not the systematic
light/medium/heavy glass hierarchy this doc specifies, and `PROJECT_REFERENCE.md`
§19 still describes that light-blue direction. This is intentional,
temporary drift: the actual redesign implementation is expected to follow in
a separate prompt — this commit is scoped to landing the spec doc itself so
it's the source of truth to build against, not to also rewriting the app in
the same pass. `PROJECT_REFERENCE.md` §19 and the rest of `DESIGN_SYSTEM.md`'s
now-superseded sections will be reconciled once that implementation work
happens, not before — recording the gap here so it isn't mistaken for
`DESIGN_SYSTEM.md` already matching reality.

## 2026-07-24 — Full redesign: Liquid Glass, replacing the light-blue flat theme

**Context:** the live V4 (light-blue, masonry grid, sidebar,
colored left borders) was reviewed and rejected as a redesign target — "functional,
but not achieving the intended experience." In review: it feels like an
admin panel, a collection of white cards, unfinished, visually flat, too
much unused whitespace, poor visual hierarchy, weak component identity.
A request came for a critique-then-redesign against the newly adopted
`docs/DESIGN_SYSTEM.md` spec (previous entry), explicitly authorizing
structural change ("challenge the existing layout if necessary... the
current implementation is only a prototype").

**Critique of V4** (given in full before implementing, summarized
here): every widget was the same white rectangle at the same size class
with the same shadow — nothing signaled what mattered most. The colored
left borders read as a tagging system, not personality. `bg-white/90` +
`backdrop-blur-sm` was translucency in name only — no tint, no inner
highlight, no layered depth, so "glass" was cosmetic. A single linear
gradient behind flat cards read as "a gradient someone added," not
atmosphere. The masonry grid, even though it fixed uneven gaps, still gave
every widget equal visual authority — nothing could be a focal point. Hero
was four floating text blocks sharing a container, not a designed unit.

**Redesign decisions and rationale:**

1. **Real glass system** (`packages/ui/src/glass.ts`): three levels
   (light/medium/heavy), each a tinted translucent fill + blur + inset
   highlight ring + layered ambient shadow, not a lowered-opacity box.
   Used by `WidgetCard`, the hero panel, sidebar, navbar, and profile
   dropdown — one shared vocabulary instead of every surface hand-rolling
   translucency.

2. **Layered ambient background**: soft neutral (`#f3f4f8` light /
   `#0b0d12` dark, "never pure white/black" per the spec) plus three large,
   low-opacity, heavily blurred color blobs (sky/violet/amber) fixed behind
   the content. This is atmosphere, not a gradient card — the specific gap
   the critique identified.

3. **Bento grid via the existing `size` field, not new plumbing.** Rather
   than inventing a new "importance" concept, `WidgetSize`'s existing
   `sm`/`md`/`lg` values now drive `sm:col-span-2 lg:col-span-2` in the
   grid. GitHub is `"lg"` (richest, most personal data — reused as the
   focal widget); Steam and Spotify are `"md"`; Quick Launch is `"sm"`.
   Considered CSS Grid row-span for true bento density but rejected it:
   row-span requires explicit row heights to mean anything, and every
   widget's height is content-driven (auto), so a forced row-span would
   either clip content or leave dead space — column-span alone, with
   content-driven height, is the more robust choice for dynamic widget data.

4. **Removed the colored left borders entirely**, per the spec's explicit
   "avoid thick colored stripes" and the "outdated" callout it drew. Identity now
   comes from a soft colored glow behind each widget's icon badge
   (`WidgetCard`'s `accent` prop, `box-shadow` glow + tinted badge, not a
   border) — GitHub blue, Spotify green (Spotify's own brand color), Steam
   indigo (a distinct darker blue). Quick Launch stays unaccented, same
   reasoning as before: no invented color with no rationale.

5. **Hero rebuilt as one grouped glass panel**, not floating text: a large
   greeting, then a row of three distinct "today" chips (date/time,
   weather, quote) — each its own small glass surface, read as related but
   individually legible, addressing "orphaned facts under a headline."
   Did **not** add an "Upcoming focus" field the brief mentioned as
   optional — there's no real task data behind it (no Tasks widget exists
   yet), and Pulse's established pattern (Spotify's play-count decision) is
   to never fabricate a fact that isn't real. Left a clean gap for it once
   a real Tasks widget exists rather than inventing placeholder content.

6. **Adaptive navigation, not responsive resizing** (this section came
   from a follow-up message sent while implementation was already
   starting — folded in before continuing rather than building a
   non-adaptive nav and reworking it after):
   - **Desktop** (`lg:` 1024px+): sidebar permanently visible, compact
     icon rail — matches the spec's own "compact, minimal, purpose driven,
     icons readable without labels when collapsed."
   - **Tablet** (`sm:`–`lg:`, 640–1024px): the *same* sidebar markup
     becomes an off-canvas drawer, toggled by a menu button in the navbar.
     Built with a hidden checkbox + Tailwind's `peer-checked:` variant
     (translate-x-full ↔ translate-x-0), not a client component with
     `useState` — consistent with the app's established preference
     (`ProfileMenu`'s `<details>`) for CSS-only interactivity over
     shipping extra client JS for what's fundamentally a show/hide toggle.
     A backdrop (`<label>` covering the viewport, same `htmlFor`) closes
     it on outside click for free, since clicking any label for a checkbox
     toggles it regardless of click target.
   - **Mobile** (below `sm:`, <640px): sidebar and drawer both disappear;
     a fixed glass bottom nav bar takes over entirely — chosen over a
     drawer for phone per the brief's "glanceable companion" framing,
     since a bottom bar is reachable one-handed and always visible, where
     a drawer requires an extra tap to even see navigation exists.
   Chose the sidebar (not a floating dock) for desktop/tablet, decisively,
   per the "either is acceptable, don't leave it as placeholder" guidance —
   reasoning: a dock (macOS-style, icons-only, implies "click to launch
   something elsewhere") fits an app-launcher metaphor, while a dashboard
   benefits from a persistent, always-present sense of place, which a
   sidebar gives more naturally and adapts to a drawer/bottom-nav pattern
   more cleanly than a dock would.

7. **Icons: Lucide for system/nav chrome, brand marks stay custom.** Added
   `lucide-react` (v1.26.0) as the spec's recommended single icon library.
   Discovered v1.x dropped brand icons (no `Github` export, confirmed via
   a failed typecheck) — Lucide is a generic UI icon set, not a brand-icon
   library. Kept the hand-drawn GitHub/Spotify/Steam marks (resized to the
   same 18px/2px-stroke scale as Lucide for visual consistency) rather than
   substituting generic shapes that would lose brand recognizability;
   every sidebar/navbar/button icon (dashboard, tasks, habits, search,
   bell, settings, sign out, refresh, menu) is genuinely Lucide now.

8. **Motion**: hover elevation (`-translate-y-0.5` + shadow bloom) on
   cards, spring-style scale (`hover:scale-105 active:scale-95`) on
   buttons — all class names prefixed `motion-safe:` so
   `prefers-reduced-motion` users get zero transform, per the spec's
   accessibility requirement, without a separate reduced-motion code path.

**Known gap, intentionally not built in this pass:** the spec's
per-breakpoint *content* adaptation ("widgets should intelligently adapt
their content, not just shrink" — e.g., showing fewer Steam games on
mobile) wasn't implemented per-widget. This pass focused on structural/
navigation adaptation (the primary, most visible gap between "functional"
and "premium"); trimming individual widgets' content density per
breakpoint is a real follow-up, not done here to keep this already-large
redesign scoped to what could be verified end-to-end in one pass.

## 2026-07-24 — Refinement pass: glass render bug, widget polish, overflow menus, dock nav

**Context:** the Liquid Glass redesign was confirmed as "a major
improvement... much closer to the intended direction" with explicit direction
not to redesign again — this pass is refinement/consistency only. Specific
issues flagged: the glass cards "still appear mostly like solid white
surfaces," Steam's bars "feel like Material Design," GitHub (the largest
widget) "doesn't fully utilize its space," the sidebar "still feels
disconnected," dropdowns didn't close on outside click, and Steam/Quick
Launch exposed Settings as a separate control from Refresh.

**1. Glass rendering bug — investigated, not guessed.** Rendered the real
dashboard and screenshotted it before touching any value. Confirmed: the
background blobs were visible in empty page space but barely bled through
the cards at all. Root cause was two compounding factors, not one: fill
opacity too high (55–80% white/zinc in `packages/ui/src/glass.ts`) and the
background blobs (`apps/web/src/app/page.tsx`) not vibrant or large enough
to actually have color sitting behind the card regions. Fixed both:
lowered `light`/`medium` fill opacity to 30–40% (kept `heavy` more opaque
since it's used for text-dense dropdowns, where legibility beats
translucency), and increased blob opacity/size and added a fourth blob
positioned to sit under the card grid, not just in the empty margins.
Re-screenshotted to confirm color now genuinely reads through every card
before moving on — this is exactly the "verify against a render, not a
description" habit this project has used since the very first Tailwind
`@source` bug.

**2. Steam progress bars.** Rebuilt per the brief's own suggestions: a
translucent glass track (inset shadow + ring, not a flat gray rectangle),
a gradient (`sky-400` → `indigo-500`) fill with a matching glow shadow,
and a CSS `@keyframes` grow-in animation on mount (`.pulse-bar-fill` in
`globals.css`) — server-rendered, so this is a pure CSS keyframe using the
real target width, not a client component faking the animation. Game icons
enlarged from 20px to 40px, rounded, addressing the separate "help Steam
feel like Steam" ask about cover art in the same pass since it's the same
component.

**3. GitHub widget composition.** Heatmap window widened from 12 to 20
weeks and cells enlarged (`HEATMAP_WEEKS` in `constants.ts`, cell size in
`heatmap.tsx`) so the widget's extra width (it's `"lg"`, spanning 2 grid
columns) is actually used. Added **current streak** and **longest streak**
(`packages/widgets/github/src/streaks.ts`) — both computed from the same
daily contribution data the heatmap already renders, zero new API calls,
genuinely real numbers. Explicitly **did not** add "latest repository" or
"latest commit" from the brief's suggestion list: the current GitHub
adapter only fetches contribution counts via one GraphQL query; showing a
real latest-repo/commit would need a second, different API call — a real
feature addition, not polish, and out of scope for a pass explicitly
scoped to refinement.

**4. Overflow menu.** Added `WidgetMenu` (`packages/ui/src/widget-menu.tsx`)
— a single "⋯" trigger opening Refresh (and Settings, when the widget has
any) — replacing every widget's bare icon-refresh button and, for
Steam/Quick Launch, the separate below-card `<details>` Settings toggle.
`ActionForm` gained a third `variant="menu"` (full-width row, matching a
dropdown item) plus an `icon` prop so the menu's Refresh row can carry a
leading icon without hardcoding one into the generic component.

**5. Dropdown click-outside-to-close — a second real CSS bug, same root
cause pattern as the glass fix (fixed something without fully tracing why
it was broken first).** The previous pass converted the profile menu from
`<details>` (which never closes on outside click) to a checkbox + `fixed`
backdrop `<label>`, believing that fixed the UX bug. It didn't, fully:
tested via Playwright (open the menu, click far outside, assert the
checkbox's `checked` state) and found it stayed open. Root cause: a
`position: fixed` element's containing block is the viewport *only* if no
ancestor establishes a new one — and `backdrop-filter` (Tailwind's
`backdrop-blur-*`, part of every `glassClass()` surface) is one of the CSS
properties that does establish one, same as `transform`/`filter`. Both the
profile menu (nested inside the blurred navbar) and the new `WidgetMenu`
(nested inside a blurred `WidgetCard`) had this bug: their "fixed
inset-0" backdrop only ever covered their own blurred ancestor's box, not
the actual viewport, so clicking anywhere outside that small box never
reached the backdrop. Fixed by dropping the backdrop approach entirely for
both: the trigger is now a real `<button>`, and the dropdown's visibility
is driven by CSS `:focus-within` on the wrapper (Tailwind's `group-focus-within/name:`)
— when focus leaves the group (i.e. the user clicks anywhere else), the
menu hides on its own, no backdrop element needed, and no containing-block
interaction possible since there's no `position: fixed` involved at all.
The nav *drawer*'s checkbox+backdrop (tablet sidebar) was left as-is — it's
a direct child of the page root with no blurred ancestor between it and
the backdrop, so it doesn't have this bug; confirmed by testing it
separately.

Known tradeoff, accepted deliberately: `:focus-within` triggered by a
`<button>` click has a documented desktop Safari quirk (buttons don't
receive focus on mouse click unless "Full Keyboard Access" is enabled —
keyboard/tab access and mobile Safari taps are unaffected). A fully
robust cross-browser fix would need a React portal (rendering the backdrop
outside the blurred ancestor's DOM subtree), which requires a client
component — judged not worth it for a personal-use dashboard on a
Chrome/Firefox/Edge-first assumption; flagged here in case it's ever worth
revisiting.

**6. Desktop navigation: dock, not rail.** The pinned sidebar
rail was flagged as "still feels disconnected," with a request to explore a bottom-center
floating dock as an alternative, explicitly leaving the choice open.
Replaced the `lg:`+ permanent sidebar rail with `Dock` in
`apps/web/src/app/page.tsx` — a floating glass pill, bottom-center,
active-state shown as a small dot beneath the icon (not a filled
background, to stay quieter than a typical OS dock). The tablet drawer and
mobile bottom nav are unchanged; `Sidebar` is now scoped purely to the
tablet breakpoint range instead of also serving as the desktop rail's
markup.

**7. Radius/motion audit.** Found two `rounded-lg` (8px) outliers in the
navbar (the drawer-toggle hamburger button, `NavIconButton`) inconsistent
with the `rounded-xl` (12px) used everywhere else at that size tier (nav
links, action buttons) — bumped both to `rounded-xl`. Motion
(`GLASS_HOVER`/`SPRING_PRESS`) was already consistently applied from the
previous pass; no changes needed there.

**Explicitly out of scope for this pass, per instruction:** Spotify's
"now playing" emphasis treatment, and the git commit-signature stop-hook
warning (those are GitHub's own web-UI merge-commit attribution, not
something to rewrite history over — already explained previously,
not revisited here).

## 2026-07-24 — Reference-matched gradient, Steam achievements, icon-only Quick Launch

**Context:** a reference screenshot was shared (a mockup with broken image
placeholders — "Game art or browse", "Cover or browse" — showing the
*intent* was real cover art / track art / service icons, not that the
placeholders themselves were the design) with a request for: the background and
cards to match it, cards to feel fuller instead of sparse, Quick Launch to
become icon-only with no text, and Steam to show more per-game detail
(last played, achievements). Explicitly asked to be asked clarifying
questions before implementing — four real open decisions, resolved via
`AskUserQuestion`:

1. **Background — smooth gradient vs. tuned blobs.** Chose to match the
   reference exactly: one smooth diagonal gradient (`from-sky-200
   via-cyan-100 to-violet-200`, dark equivalents), replacing the three-blob
   ambient-lighting approach from the previous redesign pass entirely.
2. **Hero contextual action buttons** ("Continue Palworld", "Play liked
   songs" in the reference) — the decision was to skip this. Correctly so: it's a
   real, nontrivial feature (deriving "what to resume" from live Steam/
   Spotify state, plus real deep-link behavior like `steam://run/<appid>`)
   that would have expanded this pass well beyond "polish," and skipping it
   was offered as an explicit option rather than assumed.
3. **Quick Launch icons.** The choice was fetching each link's own
   `favicon.ico` directly over a third-party favicon proxy (e.g. Google's
   service) or a manual icon picker — no new dependency on a third party
   knowing every domain the user links to, same trust boundary as visiting
   the site.
4. **Steam depth.** The decision was to add real achievement data *and* reduce
   the shown game count (5 → 2) so each game has room for the extra
   detail, rather than keeping 5 games and cramming achievements into a
   denser list.

**Implementation:**

- `packages/adapters/steam/src/client.ts` gained `fetchLastPlayedMap`
  (one `GetOwnedGames` call → `Record<appId, unixSeconds>`, since
  `GetRecentlyPlayedGames` doesn't include a last-played timestamp, only
  2-week/forever playtime) and `fetchAchievementSummary` (one
  `GetPlayerAchievements` call per game — cheap now that only 2 games are
  shown). The achievement call returns `null`, not a thrown error, when a
  game has no achievements or the data isn't available — the common case
  (most games don't support Steam achievements at all), not a failure.
- `packages/widgets/steam`: `MAX_GAMES` 5 → 2; `fetch.ts` fetches the
  last-played map and per-game achievements in parallel after narrowing to
  the top 2 recently-played games; `playtime-bar.tsx` rewritten to show
  cover art, a glass progress bar, "last played" (real, formatted via a
  small local `formatRelativeDay` helper — day-level granularity, no need
  for exact timestamps), and achievement completion when available.
- `packages/widgets/quick-launch`: new `link-icon.tsx` client component
  rendering `<img src="https://{hostname}/favicon.ico">` with a Lucide
  `Link2` fallback. **Found and fixed a real SSR race along the way**: the
  image starts loading from the server-rendered HTML immediately, before
  React's JS bundle finishes loading and hydrating; a *fast* failure (no
  favicon at that path, DNS failure, etc.) can fire the native `error`
  event before hydration attaches React's `onError` listener, so the
  fallback silently never appears — confirmed via `page.evaluate` checking
  `img.complete && img.naturalWidth === 0` after the fact, which was `true`
  even though the fallback hadn't rendered. Fixed with a `useEffect` on
  mount that checks that same condition and sets the failed state manually,
  catching failures that happened before hydration, in addition to the
  `onError` handler catching ones that happen after. Verified the fix with
  a DOM-state assertion (`querySelectorAll` for the fallback `<svg>`), not
  just a screenshot — a screenshot alone wouldn't have caught this bug in
  the first place, since a static image and a "failed to load" placeholder
  can look identical depending on timing.
- `apps/web/src/app/page.tsx`: background switched from the layered-blob
  `<div>`s to a single `bg-gradient-to-br` on the root container.

## 2026-07-24 — Renamed Vercel domain to a custom subdomain

The Vercel project's domain was renamed from the auto-generated
`*.vercel.app` alias to a custom subdomain (free rename via Vercel's
project settings, not a purchased custom domain — Vercel keeps the old
domain as a 307 redirect to the new one, so nothing broke
mid-transition). Three things had to match the new domain for auth to
keep working, all external-dashboard changes made directly (not
reachable from this environment):

- Vercel env var `AUTH_URL` → the new domain
- GitHub OAuth App's Authorization callback URL →
  `<new-domain>/api/auth/callback/github`
- Spotify app's Redirect URI →
  `<new-domain>/api/auth/callback/spotify`

No app code hardcodes the domain (`AUTH_URL` env var is the single source
used to build callback URLs — see `apps/web/src/app/api/auth/callback/spotify/route.ts`
and `packages/auth`), so this was a docs-only fix on the repo side —
`docs/ROADMAP.md`'s Phase 0 entry updated to the new domain.

## 2026-07-25 — Mobile click bug fix, nav removal, GitHub/Steam/Hero content pass

Testing the previous redesign on real mobile/iPad hardware found
the "⋯" overflow menus and the profile menu couldn't be tapped open at
all — confirming a risk I'd explicitly flagged when the `:focus-within`
dropdown fix landed (see the 2026-07-24 "Refinement pass" entry above):
"a plain `<button>` + CSS `:focus-within`... [is a] desktop Safari
tradeoff." That tradeoff turned out to be real and broader than expected —
not just desktop Safari, but mobile/iPad Safari generally, where a tap
doesn't reliably move DOM focus onto a `<button>` the way a mouse click
does. `:focus-within` had solved the *previous* bug (backdrop-blur
breaking `position: fixed` click-outside backdrops) but introduced this
one — two different CSS-only tricks, two different real bugs, both only
found by testing actual rendering behavior rather than reasoning about the
CSS in the abstract.

**Fix**: `WidgetMenu` (`packages/ui/src/widget-menu.tsx`) and `ProfileMenu`
(extracted from `page.tsx` into its own `apps/web/src/app/profile-menu.tsx`
client component, since `page.tsx`'s `Home` must stay an async server
component) rebuilt with real `useState` open/close state, toggled on
`onClick`, closed via a `document.addEventListener("pointerdown", ...)`
listener that checks whether the event target is outside the menu's root
ref. `pointerdown` (not `click`) fires identically for touch and mouse,
sidestepping the whole focus-reliability question — verified with a real
Playwright touch-simulated tap (`hasTouch: true` context, `.tap()`),
asserting the dropdown's computed `visibility` before/after, not just a
screenshot. `WidgetMenu`'s dropdown also gained `overflow-hidden` (it was
missing — `ProfileMenu`'s already had it), fixing a second, unrelated bug
reported in the same message: square per-item hover backgrounds poking
past the dropdown's rounded corners.

`ActionForm` (`packages/ui/src/action-form.tsx`) gained an optional
`onSubmitted` callback, fired once a `useActionState` action settles
without error (tracked via a `wasPending` ref across renders) — used by
`WidgetMenu` to close the dropdown after a successful Refresh click,
otherwise the menu stayed open over the fresh content.

**Navigation removed entirely, not just hidden.** The sidebar/dock/bottom-nav
was reported as never used ("all i need is just to see cards") —
confirmed via `AskUserQuestion` that this meant deleting `Sidebar`, `Dock`,
`BottomNav`, and the `DRAWER_ID` checkbox-drawer plumbing from `page.tsx`
outright, not just hiding them behind a flag. The disabled Search and
Notification `NavIconButton`s were removed from the navbar too ("i
dont use it"). This also let `main`'s bottom padding shrink back to a flat
`p-4 sm:p-6` — it no longer needs clearance for a fixed bottom nav or dock.

**GitHub card**: previously ended in the 2026-07-24 refinement pass
described "latest repository/commit" as a real content feature deliberately
deferred (needs a new API call, isn't polish). Built now:
`fetchLatestActivity` in `packages/adapters/github/src/activity.ts`, one
GraphQL query against `viewer.repositories(first: 1, orderBy: {field:
PUSHED_AT, direction: DESC}, ownerAffiliation: OWNER)` with
`defaultBranchRef.target on Commit { message, committedDate, url }`.
Returns `null` (not a thrown error) when the user has no owned repos —
a real, non-error state. Fetched in parallel with the existing
contributions query in `fetch.ts` (`Promise.all`), rendered as a small
linked row beneath the heatmap.

**Steam split into card + detail page**, confirmed via `AskUserQuestion`
("real data we already fetch" over a placeholder page): the card now shows
only large cover art and the game title, matching the reference
game-library-shelf screenshot provided as reference. Cover art uses Steam's CDN
convention `https://cdn.akamai.steamstatic.com/steam/apps/{appId}/library_600x900.jpg`
— constructible directly from `appId`, no extra API call — via a new
`CoverArt` client component (`packages/widgets/steam/src/cover-art.tsx`)
reusing the same SSR-hydration-race-safe fallback pattern as Quick
Launch's `LinkIcon` (`useEffect` checking `complete && naturalWidth === 0`
on mount, in addition to `onError`), since not every appId has a cover
(delisted/old titles 404). Hours, last-played, and achievements — previously
on the card via `playtime-bar.tsx` (now deleted) — moved to a new
`apps/web/src/app/steam/[appId]/page.tsx` route, reading the same
already-cached `SteamData` via `readWidgetCache` (no new fetch, no new
adapter call) and finding the matching game by `appId`. The steam widget
package now exports `CoverArt`, `formatHours`, `formatRelativeDay`,
`WIDGET_ID`, and the `SteamData`/`SteamGame` types specifically so the
`apps/web` route can reuse them — the first time a widget package's
internals are consumed somewhere other than its own `render()`, but still
within the SDK boundary (the shell reads cache + renders widget-owned
pieces, it doesn't gain widget-specific business logic of its own).

**Hero redesigned toward "assistant," confirmed via `AskUserQuestion`**
("rule-based, deterministic" over an LLM call — no new dependency, no
per-request cost, no new failure mode from an external AI API). The three
separate glass chips (date/time · weather · quote) became one flowing
sentence; a new `weatherTip` field on `HeroData` is computed by
`packages/widgets/hero/src/weather-tip.ts` — plain `Set`-membership checks
against the adapter's `weatherCode` (rain codes → "Take an umbrella," fog
→ "Drive carefully," clear + ≥30°C → "Stay hydrated," etc.), returning
`null` when nothing's actionable rather than forcing a generic line onto
every render. Cross-widget insights (e.g. referencing GitHub's streak or
Steam's playtime from inside Hero, via `readWidgetCache` reads of another
widget's cache — technically legal since `readWidgetCache` is already
generic/public and this is a widget-level choice, not shell-level coupling)
were considered but deliberately left out of this pass: the answer
confirmed the *style* (rule-based) but not this specific scope, and the
rest of this batch was already large enough without adding an
under-specified feature.

**Quick Launch**: tiles shrunk from `grid grid-cols-3` `aspect-square`
cells to `flex flex-wrap` with a fixed `h-11 w-11` per tile — "make it
small and follow icon size... must always take less space." `LinkIcon`
itself (the favicon-fetch + SSR-race-safe fallback) was untouched, only
its container sizing changed.

**Verification**: real Playwright screenshots via a temporary
`style-preview-tmp` route (rendering each widget's `render()` directly
with mock data and mock server-action stubs, since the sandbox can't reach
Supabase/GitHub/Steam) at desktop and mobile viewports, plus a touch-
simulated DOM-state assertion for the click-outside fix — the same
"screenshots alone aren't enough for interaction bugs" lesson from the
Quick Launch SSR-race fix, reapplied. `pnpm build` also required dummy env
vars for Supabase/Auth/Steam/Spotify to get past static generation in this
sandbox (real deploy has real secrets) — the one failure without dummy
vars was `supabaseUrl is required`, not a code defect. The temporary
preview route and its mock-action helper file were deleted before commit,
per the established pattern.

## 2026-07-25 — Steam cover art switched from portrait to horizontal

The Steam card's cover art was caught rendering portrait
(`library_600x900.jpg`) rather than the horizontal art from the reference
image shared earlier. Switched `CoverArt`
(`packages/widgets/steam/src/cover-art.tsx`) to Steam's CDN "header"
convention — `https://cdn.akamai.steamstatic.com/steam/apps/{appId}/header.jpg`,
same "just the appId, no extra API call" property as before, aspect
changed `2/3` → `16/9` on both the image and its failure-state
placeholder. The card's layout followed: two horizontal tiles side by
side (the previous `grid-cols-2`) would each be too narrow and short to
read as cover art, so `SteamComponent` now stacks them in a single
column (`flex flex-col`) at full card width. The detail page
(`apps/web/src/app/steam/[appId]/page.tsx`) changed the same way — the
cover art no longer sits in a narrow `max-w-56` side column next to the
stats; it's full-width above them, since a horizontal image constrained
to a narrow column would render tiny.

## 2026-07-25 — Grid-stretch card sizing, static (non-motion) hover cue, cover-art fallback chain

The GitHub and Quick Launch cards were flagged as "too big" from a
production screenshot, with requests for card hover to stop moving/scaling and
instead just lightly indicate cursor position, for Steam's cover art
hover to light up the border rather than animate, a question about why cover art
wasn't loading for one game, and a report of being unable to tap any button
at all on mobile — plus a request for a proper review pass and cleanup alongside.

**Root cause of "too big" cards**: `apps/web/src/app/page.tsx`'s bento
grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) never set
`align-items`, so it defaulted to CSS Grid's `stretch` — every cell in a
row stretches to the row's tallest cell, regardless of its own content
height. Once Steam became a tall stack of horizontal cover-art tiles (the
previous entry), GitHub (sharing row 1) and Quick Launch (sharing row 2
with the taller Spotify card) both had their card *background* stretched
to match, even though their actual content was much shorter — the "too
big" card was really a stretched-empty card, the same underlying CSS
mechanic as an earlier, now-fixed bug where GitHub stretched to match a
tall Steam card by a different route. Fixed with one class: `items-start`
on the grid container, so each card is only as tall as its own content.
Confirmed via a real screenshot at desktop width — GitHub and Quick
Launch now end right after their content instead of extending into empty
space.

**Hover motion removed from cards, replaced with a static color cue**:
the ask was specific — no movement or scale on card hover, just "less
obvious" acknowledgment that the cursor is over the card. `GLASS_HOVER`
(`packages/ui/src/glass.ts`) changed from `motion-safe:hover:-translate-y-0.5`
(a lift) to `hover:border-white/80 dark:hover:border-white/25
hover:ring-white/60 dark:hover:ring-white/15` — brightening the existing
border/ring instead of moving the element. `WidgetCard` also dropped the
`motion-safe:hover:shadow-[...]` growing-shadow effect that was stacked
on top, since a shadow that visibly grows reads as animation even without
a transform. Verified via a Playwright hover + `getComputedStyle` check:
`transform` stays `"none"` before and after hover; `border-color` alpha
goes from `0.5` to `0.8`. `SPRING_PRESS` (scale-on-hover/press) is
unchanged and still used for actual buttons (refresh, settings, profile,
sign-in) — the ask was about cards and cover art specifically, not
button press feedback, which is a different, expected interaction pattern.

**Steam cover art**: the `<a>` tile wrapping each game's `CoverArt` lost
`SPRING_PRESS` (was scaling the whole tile on hover) and gained `group`;
`CoverArt` (`packages/widgets/steam/src/cover-art.tsx`) now renders a
`ring-1 ring-transparent` that turns `group-hover:ring-sky-400/70` via
`transition-colors` — a border light-up with no scale, matching the
ask, applied to both the loaded-image state and the placeholder fallback
state so the affordance is consistent either way.

**Why cover art didn't load for one game**: the screenshot showed
"Forza Horizon 6" falling back to the placeholder tile while "Palworld"
loaded fine — not a bug in the fetch logic, just that `header.jpg` isn't
guaranteed to exist for every appId (newer or unusually-listed titles
sometimes only have a store capsule image, not a header capsule). Added a
one-step fallback chain: on the first image's `onError`, `CoverArt` now
retries with `capsule_616x353.jpg` before giving up to the placeholder,
via an `attempt` state bumped in a shared `handleFailure` used by both the
`onError` handler and the mount-time SSR-race check. Still zero extra API
calls — both URLs are constructible from just the `appId`.

**Mobile "can't click any button at all"**: re-verified the
`pointerdown`-based `WidgetMenu`/`ProfileMenu` fix from the previous entry
with a fresh touch-simulated Playwright pass (`hasTouch: true, isMobile:
true` context) against the GitHub menu, Steam menu, profile menu, the
Steam cover-art link, and a Quick Launch link — all five opened/navigated
correctly, and `pageerror`/console-error listeners caught nothing beyond
expected sandbox network failures (cover-art CDN unreachable from this
environment). No app-breaking hydration error, no leftover full-screen
`fixed inset-0` overlay, no stray `pointer-events` rule, found in the
current code. This strongly suggests the screenshots were taken against
the still-deployed `main` build, which doesn't yet include the click-fix
PR — the fix is real and verified in code, it just isn't live until that
PR is merged and redeployed.

**Cleanup**: removed `.pulse-bar-fill`/`@keyframes pulse-bar-grow` from
`apps/web/src/app/globals.css` — dead CSS left over from
`playtime-bar.tsx`, which was deleted in the previous Steam redesign
entry but its global keyframe was missed at the time.

## 2026-07-25 — Hardening pass, Stage 1: per-widget error isolation + streaming

The visual direction was approved as final ("do NOT redesign the
application") with a request for a senior-engineer quality pass instead:
eliminate bugs/inconsistencies, harden the architecture, no new features.
Given the scope (a 14-point checklist covering UI consistency,
responsiveness, accessibility, components, tokens, performance, error
handling, testing, code quality), agreed via `AskUserQuestion` to work in
**reviewable stages** rather than one giant pass, and to **tune the
existing 3-tier grid** rather than hand-build 7 distinct breakpoint
layouts for what's currently a 5-widget dashboard. Full staged roadmap
recorded in the plan file at the time
(`/root/.claude/plans/lovely-booping-wilkes.md` — not committed to the
repo, plan-mode artifact) and in `docs/ROADMAP.md`.

A direct code audit (not assumption) found the most serious real gap:
**no error isolation existed**. `WidgetGrid` (`apps/web/src/app/page.tsx`)
awaited every widget's cache/settings read in one `Promise.all` — any
single widget throwing failed the entire page. No `error.tsx` existed
anywhere in `apps/web/src/app`. This directly contradicted "if GitHub
fails, the dashboard still works," which wasn't actually true.

**Fix, attempt 1 (rejected by the linter, correctly)**: wrapped each
widget's cache-read + `render()` call in a plain `try/catch` inside a new
`WidgetSlot` component. ESLint's `react-hooks/error-boundaries` rule
flagged this immediately, and it's right: JSX elements are just deferred
descriptions until React actually renders them, so a `try/catch` around
`return <>{widget.render(props)}</>` only catches errors thrown
*synchronously within that top-level function* (e.g. a bad destructure) —
not errors thrown deeper in the JSX tree during React's real render pass
(e.g. inside `Heatmap`, or any client-component descendant). That's a
narrower guarantee than "if a widget fails, it's isolated," so it would
have been a false sense of safety.

**Fix, attempt 2 (shipped)**: a real error boundary. New
`WidgetErrorBoundary` (`packages/ui/src/widget-error-boundary.tsx`) — a
class component (`getDerivedStateFromError`/`componentDidCatch`; React
has no Hook equivalent, error boundaries must be classes), rendering the
new `ErrorState` primitive on catch. Composition per widget in
`WidgetGrid`:
```
<WidgetErrorBoundary name={widget.name}>
  <Suspense fallback={<Skeleton .../>}>
    <WidgetSlot widget={widget} userId={userId} />
  </Suspense>
</WidgetErrorBoundary>
```
`WidgetSlot` itself has no try/catch at all now — errors propagate
naturally, and Next.js's streaming SSR surfaces an async Server
Component's thrown error to the nearest Client Component error boundary
above it, which is exactly what `WidgetErrorBoundary` is. Verified this
isn't cargo-culted: a temporary preview route with three widgets — one
that throws, two that resolve normally (one slow, to also exercise
streaming) — showed the throwing widget's `ErrorState` while both others
rendered fully, and React's own dev-mode console log confirmed the exact
mechanism: *"The above error occurred in the `<ThrowingWidget>`
component. It was handled by the `<WidgetErrorBoundary>` error
boundary."* Route deleted before commit, per the established pattern.

**Streaming, same change**: `WidgetGrid` no longer awaits anything
itself — it's now synchronous, since layout (which grid bucket, which
column span) only depends on `widget.size`, known immediately from the
registry, not on any widget's cache data. Each widget's `Suspense`
boundary lets it stream in independently once its own cache read
resolves, instead of the whole grid blocking on the slowest widget. New
`Skeleton` primitive (`packages/ui/src/skeleton.tsx`) is the fallback —
two variants (`card`/`hero`) matching `WidgetCard`'s and Hero's shapes,
built from `animate-pulse` blocks with a `motion-reduce:animate-none`
override.

**Safety net**: `apps/web/src/app/error.tsx` added as a last-resort
Next.js route-segment error boundary for anything outside the widget
grid entirely (layout, navbar, auth lookup) — the per-widget boundaries
handle the grid itself, this catches everything else.

Deferred to later stages (per the staged plan, not forgotten): 44×44px
touch targets (`WidgetMenu`/`ActionForm`'s icon buttons are currently
32px), menu accessibility (`role="menu"`, Escape-to-close, focus
return), consistent `EmptyState` styling, and a responsive verification
sweep.

## 2026-07-25 — Hardening pass, Stage 2: shared primitives & design tokens

Four real duplicates/inconsistencies found by direct inspection (not
guessing), each fixed by extracting the shared piece into `packages/ui`
rather than leaving the copies in place:

1. **`WidgetMenu` and `ProfileMenu` duplicated the exact same
   open/close logic** — `useState` + a `pointerdown`-outside listener,
   line for line identical (the click-fix from an earlier entry landed
   in both places separately). Extracted to
   `packages/ui/src/use-dismissable-menu.ts` (`useDismissableMenu`),
   returning `{ open, setOpen, rootRef }`; both components now just call
   the hook. Behavior is unchanged — this is a pure de-duplication, not
   a rewrite.
2. **GitHub's `Stat` and Steam's detail-page `Stat`** were two
   near-identical local components (label + big value, optional suffix)
   defined in two different files, drifting slightly apart already —
   GitHub's was `text-3xl`, Steam's `text-2xl`, for no recorded reason.
   Extracted to `packages/ui/src/metric.tsx` (`Metric`), standardized on
   `text-3xl`. `value` is typed `number | string` — GitHub passes raw
   counts, Steam passes its own already-formatted strings
   (`formatHours`/`formatRelativeDay`); both are legitimately "one big
   labeled value," so widening the type was the correct fix rather than
   maintaining two components for what's really the same shape.
3. **The "soft glass chip" surface** (`bg-white/40 shadow-sm ring-1
   ring-inset ring-white/50 transition hover:bg-white/60 dark:bg-white/5
   dark:ring-white/10 dark:hover:bg-white/10`) was copy-pasted verbatim
   between GitHub's latest-commit row and Quick Launch's link tiles —
   with different radii (`rounded-2xl` vs `rounded-xl`), an inconsistency
   nobody would have caught by reading either file in isolation.
   Extracted as `GLASS_CHIP` in `packages/ui/src/glass.ts`, alongside the
   existing `glassClass`/`GLASS_HOVER`/`SPRING_PRESS` tokens it's a
   sibling to. Quick Launch's tiles now use the same radius as
   everything else using this surface (see next point) — a real,
   deliberate visual change, not just a refactor: 12px → 16px corners on
   those five tiles.
4. **No radius scale existed** — `rounded-3xl` (WidgetCard/ErrorState/
   Skeleton), `rounded-[32px]` (Hero, a bare magic value also
   copy-pasted into Skeleton's hero variant), `rounded-2xl` (dropdowns,
   navbar, GitHub's commit row, Steam's cover art), `rounded-xl` (Quick
   Launch, the one true outlier) were each typed fresh at their own call
   site. New `packages/ui/src/tokens.ts` exports `RADIUS.chip`/`.card`/
   `.hero` — named by the surface role they represent, not an abstract
   sm/md/lg scale, since Pulse only has these three actually-distinct
   radii and a semantic name is more useful than a size rung for each.
   Applied everywhere the three now-named radii were already in use
   (`WidgetCard`, `ErrorState`, `Skeleton`, `WidgetMenu`/`ProfileMenu`
   dropdowns, the navbar, GitHub's commit row, Steam's cover art and its
   detail page's outer panel) plus the one real fix (Quick Launch). This
   doesn't change most of those surfaces' appearance — it changes where
   the value comes from, so a future radius change or a new primitive
   needing to match an existing surface has one source of truth instead
   of hoping every call site was copied correctly.

Deliberately did **not** force every visually-similar surface into
`GlassChip`/`Metric` where the actual layout differs meaningfully — e.g.
Steam's achievement progress-bar track uses a similar translucent fill
but isn't interactive (no hover state), so it stays its own literal
rather than being wedged into `GLASS_CHIP`, which carries a hover
transition that wouldn't make sense on a static track. Consistency
means removing duplicate *identical* patterns, not forcing every
similar-looking thing through one component regardless of fit.

Deferred to later stages, still not forgotten: 44×44px touch targets,
menu accessibility (`role="menu"`, Escape, focus return), consistent
`EmptyState` styling, responsive verification sweep.

## 2026-07-25 — Hardening pass, Stage 3: accessibility

Verified with an automated audit, not just eyeballing: ran `axe-core`
(the same engine Lighthouse's accessibility category uses) against a
rendered preview with every widget populated — **zero WCAG 2A/2AA
violations**, before and after this stage's changes. The fixes below
came from a manual pass reading through the interactive components with
keyboard/screen-reader use in mind, since axe-core catches structural
issues (missing labels, contrast, invalid ARIA) but can't tell you a
touch target is 32px or that Escape doesn't close a menu — those needed
actual measurement/interaction testing.

**Touch targets bumped to a real 44×44px hit area**: `WidgetMenu`'s "⋯"
trigger and `ActionForm`'s icon-refresh button, both previously
`h-8 w-8` (32px) — now `h-11 w-11`. `ProfileMenu`'s trigger, and the
"menu"/"text" row variants used inside dropdowns (Refresh/Save/Sign out
rows, the Settings disclosure summary), previously ~36px tall — now
`min-h-11`. Verified via `boundingBox()` in Playwright:
`WidgetMenu` trigger measures 44×44, `ProfileMenu`'s 76.7×44 (wider
because of the name label, still ≥44 on both axes). Quick Launch's
tiles were already 44×44 (`h-11 w-11`, unrelated to this pass) — the one
surface that happened to already be correct.

**`WidgetMenu`/`ProfileMenu` keyboard support**, folded into
`useDismissableMenu` (`packages/ui/src/use-dismissable-menu.ts`) so both
components get it from one place:
- Escape closes the menu **and returns focus to the trigger** — a new
  `close()` returned alongside `setOpen`, used by Escape's internal
  handler and by `WidgetMenu`'s Refresh action (`onSubmitted={close}`,
  replacing `onSubmitted={() => setOpen(false)}`) so completing an
  action from inside the menu doesn't strand focus on a control that's
  about to disappear. Deliberately *not* used for the outside-
  click/tap dismissal path — the user already moved their attention
  elsewhere on purpose there, so yanking focus back to the trigger would
  be the surprising thing, not the helpful thing.
- The closed panel gets `inert` (a real, previously-unnoticed bug: the
  panel was only hidden via `invisible`/`opacity-0` for the transition,
  which doesn't remove it from the tab order — a keyboard user tabbing
  through the page could land on menu items that were invisible on
  screen). `inert` (React 19 passes it straight through to the DOM)
  removes it from both the tab order and the accessibility tree while
  it's closed, without breaking the open/close CSS transition.
- Verified end to end with Playwright: focus the trigger → Enter opens
  the menu (native `<button>` behavior, nothing custom needed) → Escape
  closes it, `inert` flips back on, and `document.activeElement` is
  confirmed to be the trigger button again.

**Considered and explicitly rejected**: `role="menu"`/`role="menuitem"`
on these dropdowns. That ARIA pattern implies arrow-key navigation
between items and a constrained set of valid children — and once
`WidgetMenu`'s "Settings" disclosure is expanded, the panel contains a
real `<form>` with text `<input>`s, which isn't valid content under a
strict ARIA menu. Forcing `role="menu"` here would tell assistive tech
to expect keyboard behavior (arrow keys, typeahead) that isn't
implemented, which is worse than no role at all. These are disclosure
panels that visually resemble dropdowns, not application menus — plain
buttons/forms (already keyboard-operable via Tab/Enter/Space, per the
axe-core pass finding nothing wrong) are the semantically correct
choice, not a shortcut around implementing "real" menu semantics.
`aria-haspopup="true"` (generic popup) is used instead of `"menu"`, so
the trigger's accessible description doesn't promise a pattern this
doesn't implement either.

**Reduced motion**: the dropdown open/close transition
(`scale-95`→`scale-100` + opacity) wasn't actually gated by
`prefers-reduced-motion` — `motion-safe:duration-150` only constrained
the *duration*, but Tailwind's bare `transition` utility already
animates by default regardless of that preference, so the scale
transform played unconditionally. Restructured so the `scale-*`
utilities themselves are `motion-safe:`-prefixed (opacity/visibility
still transition, which is a much gentler change than a size
transform) — verified via Playwright with a `reducedMotion: 'reduce'`
browser context: the panel's computed `transform` is `none` when open,
where it was previously a scale matrix.

**Semantic landmarks**: `WidgetCard` changed from a bare `<div>` to
`<section aria-labelledby={useId()}>`, with the title `<h2>` as the
labelled element — each widget is now a real landmark region a screen
reader can jump between (e.g. VoiceOver's rotor) instead of
undifferentiated page content. `Hero`'s existing `<section>` got the
same treatment, labelled by its `<h1>` greeting. Verified via
`document.querySelectorAll('section[aria-labelledby]')` resolving each
one's label correctly: "Good afternoon", "GitHub", "Steam", "Quick
Launch".

Deferred to later stages, still not forgotten: consistent `EmptyState`
styling, responsive verification sweep.

## 2026-07-25 — Hardening pass, Stage 4: consistent empty states

Six widgets, six hand-written "nothing to show yet" states, each a bare
`<p>` inheriting `WidgetCard`'s body text color/size but with no
consistent layout — left-aligned at the top of the card body, leaving
the rest of the card's height as dead space rather than centered within
it. New `EmptyState` (`packages/ui/src/empty-state.tsx`) — centers
within available height, matching `ErrorState`'s layout language for
the other "non-content" state a widget can be in, with an optional
`action` slot for cases where the empty state has a fix (a button, not
just text). Applied to GitHub, Steam (both its "nothing cached yet" and
"zero games" cases), Quick Launch, and Spotify (both its "zero tracks"
case and, with the `action` slot, its "not connected" case — which
previously showed a bare button with no explanatory text at all).

Found and fixed three more radius/touch-target misses while working
through these same files (not new scope — the same fixes from Stages 2–3,
just at call sites that weren't touched in those passes): Steam's game
tile wrapper `<a>` still had a literal `rounded-2xl` instead of
`RADIUS.chip`; Spotify's track-artwork thumbnails (image and fallback
block) had a literal `rounded-xl`, same fix; Spotify's "Connect Spotify"
button and the navbar's "Sign in with GitHub" button were both still
under the 44px touch-target minimum (`px-3 py-1.5`/`px-4 py-2` with no
explicit height) — both now `min-h-11`.

**Deliberately not touched**: the top-level "Sign in to see your
dashboard" message (page.tsx) — a whole-app unauthenticated state, not a
widget's data state, so routing it through a widget-scoped primitive
would be a context mismatch. The Steam detail page's "No achievement
data available for this game" line — an inline note sitting among
otherwise-populated content, not a widget's entire empty body, so
`EmptyState`'s centered-in-available-height layout would look wrong
there; it stays its own small icon+text row. Same principle as Stage 2:
consistency means applying a shared primitive where the actual shape
matches, not wherever the words "empty state" could apply.

Deferred to the final stage, still not forgotten: responsive
verification sweep.

## 2026-07-25 — Hardening pass, Stage 5: responsive verification

Actually reproduced problems via Playwright at seven real widths
(desktop 1920, large-laptop 1512, laptop 1280, iPad landscape 1024,
iPad portrait 768, large-phone 428, phone 375) against the full
dashboard (navbar + hero + all five widgets, realistic data including a
2-game Steam card and a long Spotify track title) — not assumed fine
from the single-widget checks earlier stages used. Found two real bugs.

**Bug 1 — the grid's row-track height, not actually fixed by
`items-start`.** At every width from phone through desktop, GitHub's
card shared a `grid` row with Steam. Once Steam's stacked cover art (2
games) made it taller than GitHub, a large dead gap opened up under
GitHub — visible at both the `lg:` 3-column tier (GitHub next to Steam)
and the `sm:` 2-column tier (Steam next to Quick Launch). `items-start`
(added earlier, see the redesign-batch entry) only stops a *shorter
item's own box* from stretching to match a row's height — it does
nothing about the row TRACK itself, which CSS Grid still sizes to its
tallest cell regardless of `align-items`. That's a real, spec-level
distinction I'd conflated before actually reproducing this at real
widths with real content-height variance.

Fix: replaced the single `grid-cols-3` for card widgets with two
independent flex columns — `wideWidgets` (`size: "lg"`, currently just
GitHub) in one column, everything else (`railWidgets`) stacked in a
second, narrower column (`apps/web/src/app/page.tsx`, `WidgetGrid`).
Two independent flex-column stacks have no shared row tracks, so each
one's cards simply sit tight against each other regardless of what's in
the other column — GitHub ending early just means its column ends
early, not a gap. `SPAN_CLASS` (the old per-widget grid-span map) is
gone; layout is now just "which of the two columns," decided once, not
computed per widget. This assumes at least one `"lg"` widget exists —
true today, not worth generalizing further until it isn't.

**Bug 2 — nested flex containers refusing to shrink below their
content's natural (untruncated) width**, discovered because the sweep
used a deliberately long Spotify track title
("DON'T KILL THE PARTY (feat. Quavo & Juicy J)") instead of only short
placeholder text. Text with `truncate` (`white-space: nowrap;
overflow: hidden; text-overflow: ellipsis`) has an intrinsic min-content
width equal to its *full, untruncated* width — `overflow:hidden` only
affects painting, not CSS's box-sizing algorithm — and a flex item's
default `min-width: auto` uses that untruncated width as a floor it
won't shrink below, unless every container in the chain between the
text and the point where shrinking needs to happen has `min-width: 0`.
Added `min-w-0` through the actual affected chain (`WidgetCard`'s root
`<section>` and its two direct children, plus Spotify's `<ul>`/`<li>`)
once real measurement (Playwright `getBoundingClientRect`, not
speculation) confirmed exactly where the extra width was and wasn't
coming from — narrowed the overflow from 50px to about 15px at the
375px phone width.

That remaining ~15px didn't trace to any single leaf element (nothing
measured wider than its own container), which points to a flexbox
`gap`-with-intrinsic-sizing edge case rather than one more fixable
`min-w-0` spot — plausible given how many nested flex levels this
layout now has (outer shell → main → grid wrapper → column → 
WidgetCard → content), each a place gaps and min-content calculations
compound slightly. Rather than keep chasing a sub-20px residual through
further speculative `min-w-0` placements, added `overflow-x-hidden` to
the page's outermost container
(`apps/web/src/app/page.tsx`) as a defensive backstop — verified
nothing is actually being clipped by it (every real leaf element
already renders within the viewport; this only guards against the
residual container-level rounding), and confirmed zero horizontal
scroll at all seven widths, including with the long test string still
in place.

**What wasn't touched**: no per-breakpoint bespoke layouts were built —
per confirmed preference, the fix targets the actual reproduced
problems (the grid row-height trap, the truncation-in-flex trap), not a
ground-up redesign of the responsive system. The existing `sm:`/`lg:`
breakpoint structure stays; only the *card-widgets* section changed
from a single grid to two flex columns.

## 2026-07-25 — Hardening pass, Stage 6: final review

Closing stage — verification, not new fixes. Three checks, all real
(run and read, not assumed):

**Lighthouse**, run against a genuine **production build**
(`next build && next start`), not the dev server — dev mode's lack of
minification/code-splitting makes its Lighthouse performance score
meaningless for judging the real app (confirmed directly: the same
page scored 65 performance under `next dev`, 98 under `next start` —
that gap is the dev-server tax, not a real regression). Final scores:

| Category | Score |
|---|---|
| Performance | 98 |
| Accessibility | 100 |
| Best Practices | 96 |
| SEO | 100 |

All four meet the ≥95 target from the original brief. The one
Best Practices point below 100 is `errors-in-console`, and every
logged error is `net::ERR_TUNNEL_CONNECTION_FAILED` against external
domains (Steam's CDN, YouTube/Google/Spotify/Notion favicons) — this
sandbox's outbound network is restricted to a small allowlist that
doesn't include them. Real deployment has normal internet access, so
this resolves to a clean console (and 100) there; not a code defect,
and confirmed as such by reading the actual audit detail rather than
assuming.

**Code quality sweep**: grepped every file touched across all six
stages for `TODO`/`FIXME`/`HACK` (none), explicit `any` (none — the one
regex hit was the word "any" in an English comment, not a type), and
cross-checked every new `packages/ui` export against real usage — all
either consumed by widgets/apps/web directly, or internally within
`packages/ui` itself (e.g. `ActionForm` only used by `WidgetMenu` now
that Hero no longer needs it standalone, `GLASS_HOVER`/`ErrorState`
used inside `WidgetCard`/`WidgetErrorBoundary`) — nothing exported and
orphaned.

**Self-review**, against the original closing questions:

- *Would this pass a professional design review?* The visual direction
  was already approved and untouched by this pass — what changed is
  underneath it: real error isolation, one design-token source of
  truth instead of scattered literals, consistent empty states,
  accessible interaction, verified layout at real widths.
- *Would this pass a senior frontend code review?* The two real bugs
  found in Stage 5 (the grid row-height trap, the truncation-in-flex
  trap) are exactly the kind of thing a senior reviewer would flag —
  the difference here is they were caught and fixed within this same
  pass, with the fix's reasoning and a rejected first attempt (Stage
  1's try/catch, corrected by the linter) recorded, not silently
  reverted.
- *Would another developer enjoy maintaining this?* Every widget now
  shares `Metric`, `EmptyState`, `GLASS_CHIP`, `RADIUS`, and
  `useDismissableMenu` instead of five parallel almost-identical
  implementations — the next widget added copies an existing widget's
  shape and inherits all of this for free.

**Full stage summary** (all pushed to `dev`, each its own commit):

1. Per-widget error isolation + Suspense streaming — one broken widget
   can no longer take down the whole dashboard.
2. Shared primitives (`Metric`, `GLASS_CHIP`, `useDismissableMenu`) and
   a `RADIUS` token scale — four real duplicated/inconsistent
   implementations reduced to one each.
3. Accessibility — automated `axe-core` audit (zero WCAG 2A/2AA
   violations) plus manual fixes an automated audit can't catch alone:
   44×44px touch targets, keyboard Escape + focus return, `inert` on
   closed menus, landmark regions.
4. Consistent `EmptyState` across all six "nothing to show yet" cases,
   plus a couple more touch-target/radius misses caught along the way.
5. Responsive verification — two real bugs found and fixed by testing
   at seven actual widths instead of assuming the earlier work was
   sufficient.
6. This entry — Lighthouse on a production build, a code-quality
   sweep, and this summary.

Not done, and deliberately not attempted in this pass: a permanent
automated test suite (no vitest/Playwright config exists in the repo;
verification throughout used the same ad hoc temporary-preview-route +
Playwright pattern established earlier in the project, each route
deleted before commit) and literal cross-browser testing on Safari/
Firefox/real iOS/Android hardware (this sandbox only has Chromium).
Both are real gaps worth naming plainly rather than glossing over — if
either is pursued later, that's a new, explicit scope decision, not
something this pass silently assumed.

## 2026-07-26 — "Classical" redesign: full visual system replacement

A design-tool export (`Personal_OS_layout_redesign.zip`) was supplied,
proposing a full visual replacement of Liquid Glass with "Classical": an
editorial system on a flat near-white paper ground — Cormorant Garamond
headings over Lora body, hairline dividers, a single muted-gold accent
applied only as strokes/borders (never a fill), and outlined buttons/icon
badges instead of glow/blur.

This directly reverses the 2026-07-25 Hardening-pass entry above, where
"do NOT redesign the application" was said and Liquid Glass approved as
final. Per CLAUDE.md's ground rule against contradicting recorded
decisions without flagging it, this was raised explicitly via
`AskUserQuestion` before any code changed; proceeding was confirmed, with
a request for the docs (this entry, `docs/DESIGN_SYSTEM.md`,
`docs/PROJECT_REFERENCE.md` §19, `docs/ROADMAP.md`) to be updated so
Classical becomes the recorded canon rather than a silent drift from what
was written.

**Approach**: one reviewable commit per surface, each independently
passing `pnpm build`/`lint`/`typecheck`, per CLAUDE.md's "finish one
widget completely before starting the next":

1. Foundation — serif fonts via `next/font`, the palette/token set in
   `apps/web/src/app/globals.css`, and `packages/ui/src/glass.ts` rewritten
   in place (same exported names — `glassClass`, `GLASS_HOVER`,
   `GLASS_CHIP`, `SPRING_PRESS` — so every consumer kept compiling without
   its own change). `RADIUS` in `tokens.ts` moved to Classical's 4px/7px
   convention. The three duplicated background-gradient literals
   (`page.tsx`/`error.tsx`/`steam/[appId]/page.tsx`) collapsed to the
   shared `--background` variable.
2. Shell — navbar and profile menu restyled to a plain hairline-bottomed
   bar. Deliberately did **not** add the mockup's Tasks/Notes/Settings nav
   links: those routes don't exist, and adding non-functional nav chrome
   for them would be scaffolding ahead of need (see reference doc §10/§16).
3. Widgets, in ascending order of hardcoded-color surface area: Hero →
   Quick Launch → Spotify → Steam → GitHub. Each swept its own hardcoded
   `zinc-*`/brand-color Tailwind classes for the shared tokens, and
   re-verified its loading/error/empty states still matched (per
   reference doc §7's definition of done).
4. `WidgetCard`'s `ACCENT_BADGE` (a per-widget glow color — blue/green/
   indigo/sky) was replaced with one shared outlined accent badge, since
   Classical is a mono-accent system where widget identity comes from
   icon/title, not color. The now-dead `accent` prop and
   `WidgetCardAccent` type were removed from the SDK-facing `WidgetCard`
   API rather than kept as unused surface area — call sites in
   github/spotify/steam updated accordingly.
5. GitHub's heatmap 5-step sky-blue ramp became a gold accent ramp
   (`--color-neutral-200` through `--color-accent-800`); its Today/This
   week/This year/streak metrics were left as-is — trimming which stats
   display is a content decision, out of scope for a visual redesign.
6. This doc pass.

**Not changed**: no new env vars were needed (fonts load via
`next/font`, no external API key), so `turbo.json`'s `build.env` and
`.env.example` are untouched. Dark mode got a straight tonal inversion of
the new variables, not Classical's own ramp — consistent with reference
doc §7 treating dark mode as a fallback, not an actively designed theme.

## 2026-07-26 — Fix Hero's production crash, close remaining redesign fidelity gaps

The live deployment was reported showing "Hero is unavailable" (every other
widget rendered fine) and that several details still didn't match
`docs/redesign-reference/Pulse Dashboard - Redesign.dc.html`. Two Explore
agents investigated read-only before any code changed — root cause and
fidelity gaps confirmed by direct comparison, not assumption.

**Hero crash — root cause**: `packages/widgets/hero/src/component.tsx`
called `useId()`, the only widget calling any React hook. Every widget's
`render()` is invoked from `apps/web/src/app/page.tsx`'s `WidgetSlot` as a
bare function call (`widget.render(props)`, not JSX) after
`await Promise.all(...)`. React's hook dispatcher is only reliably active
during React's own synchronous render of a component; resuming past an
`await` happens in a microtask outside that window, so the `useId()` call
throws. This explains every symptom: Hero-only (no other widget uses a
hook), production-only (the dashboard route is dynamic/auth-gated, so
`next build` never exercises this path), and invisible to
`pnpm build`/`lint`/`typecheck`. **Fix**: dropped `useId()` for a static id
(`"hero-heading"`) — safe since Hero is a singleton (`size: "hero"`, at
most one instance ever rendered). Verified by reproducing the actual call
shape (async component, await, then a bare `widget.render()` call) in a
temporary preview route — Hero rendered without throwing before the fix
would have; confirmed the fixed code has no hook call left in that path.
**A real gotcha for future widgets**: don't call `useId`/`useState`/etc.
directly inside a widget's `render()` — it's never invoked as real JSX by
the shell.

**Fidelity gaps closed** (each verified against the mockup, not
eyeballed):
- `WidgetCard` gained an optional `tag` prop (`packages/ui/src/widget-card.tsx`)
  — the mockup's status badge next to each widget's title (GitHub
  "Connected", Spotify "Top tracks", Steam "N played"), which had no slot
  at all before. Three variants matching Classical's `.tag-outline`/
  `.tag-accent`/`.tag-neutral` (`.tag-accent-2` folds into `accent` — the
  reference system's own readme notes accent-2 reads identically to accent
  in this mono-accent palette).
- Hero gained the mockup's kicker date line (`SATURDAY, JULY 25`) above the
  greeting and a literal `<hr>` closing the header, replacing the
  `border-b` approximation from the original redesign pass. The body
  sentence no longer repeats the date (kicker already shows it), matching
  the mockup's wording.
- GitHub's metrics trimmed from 5 (Today/This week/This year/Current
  streak/Longest streak) to the mockup's 3 (Today/This week/Streak) —
  `streaks.ts`'s computation untouched, just fewer `Metric`s rendered.
  "This year" and "longest streak" data still exist in `GitHubData` if
  wanted later.
- Quick Launch's tiles changed from `RADIUS.chip` to fully circular
  (`rounded-full`), matching the mockup's circular icon buttons.
- Navbar gained the mockup's Dashboard/Tasks/Notes/Settings links
  (Dashboard active, the rest dimmed/non-interactive text — no new
  routes), and the widget grid gained static "Coming soon" cards for
  Tasks/Notes (built by passing static props straight to `WidgetCard`, no
  new widget package, no registry entry, no adapter — pure presentational
  content matching the mockup). This reverses the "leave these out"
  decision from the original redesign pass, which had explicitly flagged
  it as needing confirmation before scaffolding UI for features that don't
  exist — confirmed twice, with exact reference fidelity wanted, so this
  is the confirmed reversal, not a silent one.

**One deviation kept, deliberately**: the mockup uses one uniform 3-column
CSS grid; the live layout uses two independent flex columns (wide `"lg"`
column + a rail) instead. This is the Hardening pass Stage 5 fix for a
real CSS Grid row-stretch bug (a shared grid track sizes to its tallest
cell regardless of `align-items`, leaving dead gaps under shorter cards).
The flex-split fix was confirmed as the direction, rather than reverting to a
literal uniform grid and reintroducing that bug — recorded here per
CLAUDE.md's design-fidelity section, which requires explaining a
constraint-driven deviation rather than silently deviating.

**Verification**: `pnpm build`/`lint`/`typecheck` after every change, plus
a temporary preview route (deleted before commit, per the established
pattern) rendering every widget with mock data — including reproducing
`WidgetSlot`'s exact async/bare-function-call shape for Hero specifically,
so the crash-fix verification wasn't just "it looks fine," it exercised
the actual mechanism that broke in production. Screenshotted and compared
against the mockup side by side.

## 2026-07-26 — Layout/UX fixes from real-device screenshots

Real desktop/iPad/mobile screenshots of the live production
site were sent, listing 9 concrete problems. Two shared one root cause; the rest
were independent, well-scoped fixes — all verified against real
screenshots and computed layout metrics, not guessed at.

**1+3. Huge empty space on desktop; iPad looked "broken"** — same root
cause. `WidgetGrid` (`apps/web/src/app/page.tsx`) split non-hero widgets
into two independent flex columns via a hard rule: "lg"-sized widgets
(only GitHub) in the wide column, everything else in the rail. With 5
items (Steam, Spotify, Quick Launch, plus the two static Tasks/Notes
cards) stacked against GitHub alone, the wide column ended far shorter
than the rail — dead space on desktop, and "the left column is empty" at
iPad width, which was the same imbalance, not a broken breakpoint.
Replaced the hard split with a greedy weight-balance, reusing the SDK's
existing `size` field (`sm`/`md`/`lg` → 1/2/3) as a height proxy: walk
all non-hero widgets in registry order, assign each to whichever column
has the lower running weight (ties → left, so GitHub still anchors the
wide column). One override was needed on top of the size-based weights:
Steam renders far taller than a typical "md" widget (two full 16:9
cover-art tiles), so its size alone underestimated its real height and
left a visible gap under its column-mate — confirmed by screenshot, then
fixed with a small `WIDGET_WEIGHT_OVERRIDE` map (just `steam` → `lg`'s
weight) rather than restructuring the whole weighting scheme for one
widget. Verified by rendering the real widget set with realistic mock
data (Steam's two-cover-art case included) at desktop and iPad widths —
before: GitHub alone in a short left column against 6 stacked items on
the right; after: both columns end within ~130px of each other.

**2. Navbar not sticky** — `Navbar` already had `sticky top-0`; the
outer page wrapper's `overflow-x-hidden` (with no `overflow-y` set,
which per spec computes `overflow-y: auto`) was the suspect — a
well-documented class of bug where a non-`visible` overflow ancestor can
interfere with `position: sticky` descendants. Removed `overflow-x-hidden`
(the components already use `min-w-0` throughout to prevent flex
overflow, so it wasn't load-bearing) and collapsed a redundant nested
wrapper div left over from the original glass-background era. Verified
with a real Playwright scroll test (not just eyeballing): scrolled to
1500px, read the header's `getBoundingClientRect()` — `top: 0` on both
desktop and mobile, confirming it stays pinned.

**4. Mobile nav crowding** — a missed detail from the earlier fidelity
pass: the mockup's own CSS hides the disabled nav links
(`.os-nav-soon { display: none }`) below 600px. Our navbar showed
Dashboard + Tasks + Notes + Settings + the profile control in one
`flex-wrap` row at every width, which is exactly the crowding that read
as dropdown overlap on narrow phones. Fixed by hiding Tasks/Notes/
Settings below `sm:` (640px), leaving just the brand, "Dashboard", and
the profile control on mobile.

**5. Mobile content appeared shifted right** — checked empirically via
`document.documentElement.scrollWidth` vs `clientWidth` at a 390px
viewport: no overflow found (both exactly 390) after the other fixes
(the overflow-x-hidden removal and wrapper-div collapse above). Recorded
as resolved pending confirmation against the real site, since a
sandbox mock can't rule out something specific to real fetched data.

**6. Steam cover-art fallback looked broken** — the failure-state
placeholder was just an icon in a large empty box. Added a "No cover
art" label under the icon so it reads as an intentional empty state.

**7. Mobile card spacing too tight** — bumped the inter-card gap in both
flex columns from `gap-4` to `gap-5`/`gap-6`, matching Classical's "airy,
don't crowd the margins" principle.

**8. Hero heading oversized on phones** — was `text-4xl ... sm:text-5xl`
(36px mobile flat, 48px ≥640px). The mockup drops its `h1` specifically
below 600px (42px → 34px), a relative downsize the fixed 36px mobile
size didn't capture for the smallest phones. Added an intermediate step:
`text-3xl sm:text-4xl md:text-5xl` (30px → 36px → 48px).

**9. Duplicate "Settings" entries** — the navbar's new "Settings" link
(previous fidelity pass) and `ProfileMenu`'s pre-existing disabled
"Settings" dropdown item both signaled the same not-yet-built feature.
Removed `ProfileMenu`'s entry, keeping just Sign out — one placeholder
per not-yet-built feature, not two.

**Verification**: `pnpm build`/`lint`/`typecheck`, plus a temporary
preview route (deleted before commit) that temporarily re-exported
`Navbar`/`balanceColumns` from `page.tsx` so the preview exercised the
actual production code paths rather than a re-implementation —
screenshotted at desktop (1280px), iPad (1180×820, matching the
devtools test used), and mobile (390px), plus the scroll/overflow checks
above. Screenshots sent for review before opening a PR, per
explicit request this round — not merged sight-unseen like earlier
passes.

## 2026-07-26 — Installable PWA shell (manifest + minimal service worker)

A request came in for Pulse to be installable to a phone home screen and to open
without browser UI. This is dashboard-shell chrome, not a widget, so it
lives in `apps/web` directly rather than through the widget/adapter layer.

**Decision:** Added `apps/web/public/manifest.json` (name/short_name
"Pulse", `display: "standalone"`, background/theme color `#3d2817`,
192/512 icons) and a minimal app-shell service worker at
`apps/web/public/sw.js` (network-first with cache fallback for the shell
route and manifest, so the app still opens offline after a first visit).
Wired both into `apps/web/src/app/layout.tsx` via Next's `Metadata`/
`Viewport` APIs (`manifest`, `icons`, `appleWebApp`, `viewport.themeColor`)
rather than hand-written `<link>`/`<meta>` tags, since Next dedupes and
manages those slots itself — hand-writing them risks duplicate tags.
Service worker registration lives in a small client component
(`register-service-worker.tsx`) since `navigator.serviceWorker` only
exists client-side.

Icon files themselves (`icon-192.png`, `icon-512.png`, `icon-180.png` in
`apps/web/public/icons/`) are not committed — the actual
image assets are provided separately.

Production is served via Vercel, which is
HTTPS by default, satisfying the service-worker HTTPS requirement.

## 2026-07-26 — Spotify widget: top artist + genre now, Recently Played/Weekly Minutes/Streak/Mood deferred

A request came in to swap Spotify's "Top Tracks" widget for a richer set: Recently
Played, Weekly Minutes, Top Genre, Top Artist, Listening Streak, Today's
Mood. Built what's directly supported by the already-authorized
`user-top-read` OAuth scope; the rest needs real follow-up work, not just a
new API call, so it's deferred and recorded here rather than attempted.

**Built this round:**
- **Top artist** — `GET /v1/me/top/artists`, same `user-top-read` scope
  already granted; new `fetchTopArtists` in `packages/adapters/spotify/src/
  top-artists.ts`, mirroring `fetchTopTracks`'s shape.
- **Top genre** — Spotify has no genre endpoint; derived as the most
  frequent genre across the top-artists response's own `genres[]` fields
  (`deriveTopGenre`, same file). No extra API call.

**Deferred, not attempted:**
- **Recently Played** needs OAuth scope `user-read-recently-played`, which
  already-connected users have not granted — this needs a re-consent/
  reconnect flow (`/api/connect/spotify`), not just a new call.
- **Weekly Minutes** and **Listening Streak** have no Spotify API field at
  all — both would require Pulse to build its own listening-history
  tracking over time (repeatedly polling recently-played and summing), a
  genuinely new feature.
- **Today's Mood** (`/v1/audio-features`) doesn't need a new user scope,
  but Spotify restricted several endpoints — audio-features among them —
  behind "extended quota mode" app approval as of their Nov 2024 API
  changes. Real availability risk independent of scopes; needs checking
  against Pulse's actual Spotify app tier before promising this feature.

## 2026-07-26 — Removed Quick Launch widget

A request came in to remove Quick Launch entirely. It had no external
API/adapter and no per-widget database tables (settings/cache are
generic, keyed by `widget_id`), so removal is purely a code/registration
change:

- Deleted `packages/widgets/quick-launch/` outright.
- Removed its import/registration from `apps/web/src/lib/register-widgets.ts`
  and its dependency from `apps/web/package.json`, then regenerated
  `pnpm-lock.yaml`.
- Removed its line from `docs/ARCHITECTURE.md`'s widget tree listing.

Any existing `widget_settings`/`widget_cache`/`widget_registry` rows for
`widget_id = 'quick-launch'` become harmlessly orphaned — no migration
needed, the generic tables don't reference widget code.

## 2026-07-26 — Habits/Reading/RSS placeholders: reopening Habits, adding two new backlog items

A request came in for Habits, Reading, and RSS widgets. This conflicts with two
things already on record, so per this repo's CLAUDE.md ("don't contradict
`docs/PROJECT_REFERENCE.md` without explaining why first and getting
explicit approval") this was flagged directly before proceeding:

- **Habits** was explicitly reviewed and dropped from active scope on
  2026-07-22 ("doesn't fit actual long-term use of Pulse" —
  see `docs/ROADMAP.md`'s Phase 1 rescoped section).
- **Finance** is filed under `docs/PROJECT_REFERENCE.md` §10's post-MVP
  backlog ("don't build until the core widgets are in daily use").
- **RSS** wasn't on the roadmap or in `docs/PROJECT_REFERENCE.md` at all —
  a net-new addition, not a resurrection.

**Decision:** reopen Habits, and add Reading and RSS, as placeholder-
only "Coming soon" cards for now — the same static pattern already used for
Tasks/Notes in `apps/web/src/app/page.tsx`'s `WidgetGrid` (a `WidgetCard`
with `tag={{ label: "Coming soon", variant: "neutral" }}`, `opacity-70`
wrapper, static descriptive text, no refresh/settings menu). These are
deliberately **not** real `registerWidget()`-based `Widget` objects yet —
building the actual fetch/cache/registration machinery for something with
no real data source behind it would itself violate
`docs/PROJECT_REFERENCE.md` §7 ("fetches real data") and the "don't
scaffold ahead of need" rule. **Finance stays excluded** — confirmed
as "later," with no placeholder added yet either.

When each of these becomes a real widget:
- **Habits**: the request was for it to "feel alive" — proposed direction (not
  built yet): large circular tap-target checkboxes (44×44px minimum touch
  target) with `motion-safe:` scale/spring feedback on toggle (reusing
  `SPRING_PRESS` from `packages/ui/src/glass.ts`), a small streak indicator
  per habit once >1 day, daily reset at local midnight (mirroring Hero's
  existing `HERO_TIME_ZONE` handling), and no "you failed" error styling on
  a missed day — encouragement over guilt, matching the calm "Classical"
  design philosophy.
- **Reading**: kept empty/minimal for now by explicit request. The
  Steam per-game detail page (`apps/web/src/app/steam/[appId]/page.tsx`) is
  the established template for a "click through to a detail page" pattern
  once there's a real "current book" concept to build against.
- **RSS**: sources mentioned as examples — GitHub Blog, OpenAI, Apple,
  Steam.

## 2026-07-27 — Replaced the "Pulse" wordmark with a logo mark; scoped hover-glow exception

Original artwork was provided (a hand-drawn swash "P" signature mark, two
crops: a full "Pulse" lockup on a cream backdrop, and the mark alone) along with
a request for the header text to be replaced by it everywhere, and for the
same mark to become the mobile home-screen icon.

- The cream backdrop was chroma-keyed out of the full lockup crop (uniform
  `rgb(250,235,219)` background, so a straightforward distance-based alpha
  key with a soft threshold band avoided a hard-edged cutout) and
  tight-cropped to its ink bounding box, producing
  `apps/web/public/logo-pulse.png` — used in place of the "Pulse" text in
  both `RefreshAllTitle` (the signed-in, clickable refresh-all control) and
  the signed-out header fallback in `apps/web/src/app/page.tsx`.
- This is a flattened raster, not a themeable vector, so it can't follow
  `--foreground` the way the text it replaces did. Applied `dark:invert` as
  the pragmatic fix — the ink flips to light-on-dark instead of vanishing
  against Pulse's dark background, satisfying "dark mode still functions
  as a fallback" without needing a second hand-authored asset.
- The mark-alone crop was used as-is (cream backdrop kept, since it's
  original reference art and a fixed exported asset rather than a live
  themed surface) to regenerate `apps/web/public/icons/icon-{192,512,180}.png`
  and `apps/web/src/app/favicon.ico`.
- **Hover/focus glow exception**: `docs/DESIGN_SYSTEM.md` bans blurred/
  colored shadows and backdrop blur as a general rule. An explicit request came
  for a subtle glow on this mark since it doubles as the global-refresh
  button and needed its own "this is clickable" cue beyond the existing
  opacity dip. Implemented as a small, low-opacity gold `drop-shadow`
  (`hover:drop-shadow-[0_0_6px_color-mix(in_srgb,var(--color-accent)_55%,transparent)]`),
  gated on `motion-reduce`, applied only to this one control — not a
  precedent for glow/blur elsewhere in the system.

## 2026-07-27 — Fetch timeouts and runtime widget-cache validation

A request came in to close out two structural gaps flagged in a status review
before moving on to anything else: no timeout on widget `fetchData()`
calls, and no runtime validation on data read back out of `widget_cache`.

**Fetch timeouts.** `WidgetFetchContext` (`packages/sdk/src/widget.ts`)
gained an optional `signal?: AbortSignal`. `refreshWidget`
(`apps/web/src/lib/refresh-widget.ts`) — the single call site used by both
the cron route and the manual "Refresh"/"Refresh all" actions — now
creates one `AbortSignal.timeout(10_000)` per `fetchData()` call and
passes it down. Every adapter function that calls `fetch()` (GitHub's
GraphQL calls, both Spotify token/top-tracks/top-artists calls, all three
Steam endpoints, Open-Meteo) now accepts an optional `signal` parameter
and forwards it to its own `fetch()` call; each widget's `fetch.ts` passes
`context.signal` through. A hung upstream call now fails just that one
widget after 10s instead of being able to stall an entire cron batch
until the platform's own function timeout kills it. Left deliberately
untouched: `exchangeCodeForTokens`/`fetchSpotifyProfileId`'s caller (the
Spotify OAuth callback route) — that's a one-time interactive redirect
flow, not part of the cron fan-out the bug was actually about, so it
keeps its existing (untimed) behavior rather than forcing an unrelated
change through this pass.

**Runtime cache validation.** `Widget<TData, TSettings>` gained an
optional `dataSchema?: ZodType<TData>` field. `readWidgetCache` accepts an
optional third `schema` parameter — when given, it `safeParse`s the row
and throws a descriptive error on a mismatch instead of silently trusting
a stale shape; omitted, it falls back to the previous cast-only behavior,
so adoption is per-widget, not a forced repo-wide migration in one commit.
All four live widgets (Hero, GitHub, Steam, Spotify) now define their
`TData` type as `z.infer<typeof theirSchema>` — the schema is the single
source of truth instead of a hand-maintained interface that could drift
from a hand-maintained schema — and wire `dataSchema` into their `Widget`
object. `zod` added as a dependency of `@pulse/sdk`, `@pulse/database`,
and the four widget packages (not the adapter packages — the validated
shape is each widget's persisted `TData`, not an adapter's raw API
response type).

One deliberate exception: Hero's own internal self-read of its previous
cache (`packages/widgets/hero/src/fetch.ts`, used only to avoid repeating
the immediately-previous quote) stays unvalidated — it's a soft, best-
effort read that never reaches `render()`, and making it throw on a shape
mismatch would turn a cosmetic "might repeat one quote" edge case into a
hard failure for the entire Hero fetch, which is a worse outcome than the
gap it would be closing.

Steam settings (`SteamSettings`, stored in `widget_settings`, not
`widget_cache`) were out of scope — the flagged gap was specifically about
cached widget *data*.

## 2026-07-27 — Automated test suite (Vitest + Playwright, wired into CI)

The Hardening pass (2026-07-25) named "no committed automated test suite"
as an honest gap — every verification pass up to that point was ad hoc
Playwright against a temporary route, never saved, never re-run. A request came
to close this before adding more widgets, with two decisions confirmed
first: cover both unit-level logic and real browser interaction (not just
one), and wire it into GitHub Actions so it runs on every push/PR — not
just something runnable locally that nothing forces anyone to run.

**Unit/component tests (Vitest)**, one `vitest.config.ts` + `test` script
per package that has something worth testing, run via `pnpm test` (added
to `turbo.json` as a `test` task alongside `lint`/`typecheck`):

- `packages/database`: `readWidgetCache`'s validation behavior (the
  Zod-schema fix from the previous entry) — null/no-schema/valid/invalid
  cases, with the Supabase client mocked.
- Each live widget package (`hero`, `github`, `steam`, `spotify`): its
  `dataSchema` parses valid data and rejects drifted/invalid shapes, plus
  whatever pure logic already existed — `computeStreaks` (GitHub),
  `formatHours`/`formatRelativeDay` (Steam), `weatherTip` (Hero).
- `packages/adapters/spotify`: `deriveTopGenre`'s tie-breaking behavior.
- `packages/ui`: two component tests using React Testing Library +
  jsdom — `useDismissableMenu` (open/close/outside-tap/Escape, the exact
  contract behind the real mobile tap-to-open bug from the 2026-07-25
  polish pass) and `WidgetErrorBoundary` (renders normally, isolates a
  thrown error, recovers on `resetKey` change) — the two shared primitives
  behind Pulse's actual resilience/accessibility guarantees, not
  incidental UI.

**End-to-end tests (Playwright)**, `apps/web/e2e/homepage.spec.ts` +
`apps/web/playwright.config.ts`, run via `pnpm --filter @pulse/web
test:e2e`. Deliberately scoped to the **signed-out** shell only: a
real authenticated run would need live Supabase/GitHub OAuth credentials
this CI environment (and this sandbox) doesn't have, and building a mock
auth/database layer just to unblock CI was judged out of scope for a
first pass — a real limitation, named here rather than silently
worked around with a fake backend. Covers: page loads with no console
errors, the new logo mark and "Sign in with GitHub" render correctly, and
no horizontal overflow at desktop/tablet/mobile widths — the last one is
the automated form of the exact manual sweep the Hardening pass's Stage 5
did by hand.

**CI**: `.github/workflows/test.yml` runs on every push to `main` and
every PR — install, lint, typecheck, `pnpm test`, build, then Playwright's
browser install + `test:e2e`, uploading the HTML report as an artifact on
failure. Uses the same placeholder Supabase/Auth env vars as local manual
verification (never real secrets) — `next build`'s static analysis touches
the auth route bundle even for pages that don't need a session, so some
non-empty values have to be present, but nothing in this suite ever
actually reaches Supabase or GitHub with them.

**Still open, unchanged by this pass**: cross-browser testing remains
Chromium-only (this sandbox and GitHub's standard runners both lack
Safari/real iOS Safari access) — genuinely not closable from here, stays
a named gap rather than a false "done."

## 2026-07-27 — Logo size, sparkle hover, header/hero gap, clickable profile menu

Four small polish requests, each with a real fork resolved via
`AskUserQuestion` before writing code:

- **Logo size**: `h-8` (32px) → `h-9` (36px), +12.5%, uniformly across
  breakpoints rather than tiering it larger on desktop — "large on all
  devices" read as "don't let it shrink relatively on mobile," not "grow
  it further on desktop only."
- **Sparkle hover/tap effect** (`refresh-all-title.tsx`): the existing
  gold `drop-shadow` glow (already a documented one-off exception to
  DESIGN_SYSTEM's no-blur rule) gets three small four-point sparkle SVGs
  around the mark, fading in/out with a staggered delay. Driven by one
  `active` boolean (hover *or* keyboard focus — kept unified for parity)
  plus a separate `tapPulse` boolean that fires on click and clears itself
  after 900ms, since touch devices never get a real hover state to key
  off. `sparkling = active || tapPulse` so a real hover never gets cut
  short by the tap timer.
- **Header → hero gap**: `<main>`'s own `p-4 sm:p-6` was creating a
  16–24px gap between the header's bottom border and the hero banner, on
  top of the header's own padding, making the two feel disconnected. Gave
  the hero wrapper `-mt-4 sm:-mt-6` (canceling main's top padding, the
  same trick it already used horizontally via `-mx-4 sm:-mx-6`) plus a
  smaller `pt-2 sm:pt-3` — roughly half the previous gap, not fully flush.
  Only affects the hero; the widget grid below keeps its normal spacing.
- **Clickable profile menu** (`profile-menu.tsx`): the name/email block is
  now a `<Link href="/profile">` with a trailing chevron, instead of
  inert text — kept the name/email visible rather than replacing it with
  a generic "View Profile" label, so nothing previously visible at a
  glance became hidden behind a click. Needed a real destination, so
  added `apps/web/src/app/profile/page.tsx` — deliberately minimal (just
  the same name/email/avatar the menu already showed, on their own page),
  matching the Steam detail page's back-link + card pattern. The
  Preferences/Appearance/Connected Services/API Keys sections
  mentioned are an explicit "later" — building them now would be
  scaffolding ahead of need, not what was asked for this round. The
  existing disabled "Settings" nav item in the menu was left untouched;
  its relationship to the new profile page is a call for whenever it
  actually gets built out, not this pass.

## 2026-07-27 — Logo hover redone (mask-recolor, no glow/sparkle), bigger at every breakpoint

The sparkle/glow treatment was tried live, with a request for something simpler:
the wordmark itself should light up gold on hover, not glow behind it —
and the logo still read as too small on desktop even after the previous
+12.5% bump, so it needed to grow further at every breakpoint, most of all
on desktop.

- **Removed** the three sparkle SVGs and the gold `drop-shadow` entirely
  from `refresh-all-title.tsx`.
- **New hover treatment**: the logo is no longer a plain `<img>` — it's a
  `<span>` with a CSS `mask-image`/`-webkit-mask-image` pointing at the
  same `/logo-pulse.png` (the mask only reads the source's alpha channel,
  discarding its own baked-in ink color) and a `background-color` that
  the mask paints with. Default `bg-[var(--foreground)]`, transitioning to
  `bg-[var(--color-accent)]` (gold) on the same `active`/`tapPulse` state
  the sparkle version used — hover/keyboard-focus sustains it, a tap gives
  touch devices the same effect as a brief pulse. This is a genuine
  improvement over the old `<img>` + `dark:invert` approach too: since
  `--foreground` already flips per theme, the mask adapts to light/dark
  automatically without the invert hack, and "light up" is now a literal
  color change on the mark itself rather than an aura around it.
- **Size**: `h-9` (36px, uniform) → responsive `h-10 sm:h-12 lg:h-16`
  (40px → 48px → 64px), applied to both the clickable signed-in mark and
  the static signed-out one. Confirmed via Playwright at 390px/1000px/
  1280px widths that this doesn't reintroduce horizontal overflow or clip
  against the header at any size.

## 2026-07-27 — Header/logo shrunk back to icon size, GitHub monthly summary, auto-refresh on return, quote variety

Four independent requested changes made in the same pass.

- **Header/logo reverted to icon size**: the two prior size bumps above
  (`h-8` → `h-9` → `h-10 sm:h-12 lg:h-16`) had made the header noticeably
  taller, since `Navbar` (`apps/web/src/app/page.tsx`) has no fixed
  height — it's just padding around whatever's tallest inside it. A request
  came for the header back to a slim, icon-sized bar. Logo shrunk to
  `h-6 sm:h-7` (24px/28px, dropping the `lg` bump) at both render sites
  (`page.tsx`'s signed-out `<img>`, `refresh-all-title.tsx`'s signed-in
  masked `<span>`), and the header's own `py-3` reduced to `py-2`. If a
  future request wants the logo bigger again, this entry is why it was
  taken back down — not an oversight to "fix."
- **GitHub widget: condensed monthly activity summary**: GitHub's profile
  "Contribution activity" feed was referenced, with a question of whether Pulse
  could show something similar. Rather than reproducing GitHub's dense
  itemized timeline (per-repo commit breakdowns, PR cards with comment
  counts, expandable "N other pull requests" sections) — which would
  fight the calm/considered design philosophy and add real adapter/UI
  surface — built a condensed summary instead: a few non-zero highlight
  lines ("N commits across M repositories", "N pull requests opened", "N
  repositories created"), sourced from the same GitHub GraphQL
  `contributionsCollection` aggregate fields the heatmap already queries
  (`totalCommitContributions`, `totalRepositoriesWithContributedCommits`,
  `totalPullRequestContributions`, `totalRepositoryContributions`) — no
  new REST/events polling, no new OAuth scope. On desktop the summary
  sits beside the heatmap (`lg:flex-row lg:justify-between` in
  `component.tsx`) rather than below it, since the heatmap only runs
  ~320px wide while the card is much wider — filling otherwise-empty
  space instead of stacking. Below `lg` (tablet/mobile) it stacks
  normally.
- **Auto-refresh when the app becomes visible again**: Pulse has no
  client-side data-fetching layer — the dashboard is a Server Component
  reading `widget_cache`, refreshed server-side by cron every 30 minutes
  (2026-07-20 entry) or by the logo's manual-refresh form submit. Nothing
  previously refreshed on return to the app, so a mobile session left
  backgrounded for an hour stayed stale until manually tapped. Added
  `visibilitychange`/`window focus` listeners in `refresh-all-title.tsx`
  that call `formRef.current?.requestSubmit()` (the same
  `refreshAllWidgetsAction` the logo click already uses) when the app
  becomes visible again — but only if at least 5 minutes have passed
  since the last refresh (`AUTO_REFRESH_THRESHOLD_MS`). Chosen
  deliberately over refreshing on every single return: every third-party
  adapter (GitHub, Spotify, Steam, weather) has its own rate limit, and
  the cron job already keeps data fresh in the background regardless of
  client activity, so an unconditional trigger would mostly just repeat
  work for no benefit.
- **Quote variety + click-to-cycle** (Hero widget): the 30-quote list in
  `packages/widgets/hero/src/quotes.ts` was already picked via genuine
  `Math.random()`, but only excluded the *immediately previous* quote —
  short A→B→A cycles were statistically unsurprising with that small a
  list, which read as "it keeps repeating." Widened the exclusion window
  to the last 5 shown quotes (`recentQuotes` added to `HeroData`, tracked
  in the cache; selection logic extracted to `pick-quote.ts`, shared by
  the normal 15-minute refresh and the new click handler below). Also
  made the quote itself clickable to cycle on demand. A question came up whether a
  quote-only refresh would be faster than reusing the widget's full
  refresh action — yes: `actions.refresh` re-runs all of `fetchHeroData`,
  including a weather API call, on every click, while a dedicated
  `cycleQuote` (`packages/widgets/hero/src/cycle-quote.ts`) only rewrites
  the cached `quote`/`recentQuotes` fields, no weather call. The
  dedicated action was chosen for responsiveness on repeated clicks. This needed a
  new optional `cycleQuote` field on the SDK's `WidgetActions` interface
  (`packages/sdk/src/widget.ts`) — Hero is the only widget that populates
  or reads it (wired in `apps/web/src/app/page.tsx`'s `WidgetSlot`,
  matching `widget.id === HERO_WIDGET_ID`); every other widget's `actions`
  object leaves it `undefined`.

## 2026-07-27 — Hero gap fix, GitHub layout/accuracy, Steam grid, profile card, instant quote

The previous round was reviewed live, flagging five more issues from
screenshots. Each root-caused before fixing:

- **Hero whitespace**: the huge gap before the widget grid wasn't one
  oversized value — the hero wrapper's own `pb-6 sm:pb-8` bottom padding
  (`apps/web/src/app/page.tsx`) was *additionally* stacking with `<main>`'s
  `gap-6`, since both are direct flex children of the same `<main>`.
  Reduced to `pb-2 sm:pb-3`, mirroring the top-side fix from the prior
  header→hero gap entry (roughly halved, not flush). This was explicitly chosen
  over adding calendar/focus/AI-summary/"continue where you left
  off" content — none of that data exists in Pulse yet (no tasks/notes/AI
  adapter), and building one now would be scaffolding ahead of need.
- **Quote/icon misalignment**: `quote-button.tsx`'s `min-h-11` touch
  target triggered native `<button>` vertical-centering behavior, pushing
  the quote text below the Sparkles icon (which stayed top-aligned via
  `items-start`/`mt-0.5`, tuned for the old plain `<p>` before the button
  existed). Fixed by switching the row to `items-center` (letting the
  icon center against the button's own centered text) and adding
  `appearance-none` to the button to remove native rendering quirks.
- **GitHub summary read as floating text**: the heatmap+summary row had
  no shared surface — `justify-between` alone was pushing them apart with
  nothing visually connecting them. Wrapped the row in the same chip
  surface (`RADIUS.chip` + `GLASS_CHIP`) already used for the latest-
  activity row two lines below, so heatmap and summary now read as one
  bordered panel.
- **GitHub "latest activity" showing a stale repo**: `activity.ts`'s
  query took `first: 1` sorted by `PUSHED_AT`, then showed that repo's
  default-branch commit. `pushedAt` tracks pushes to *any* branch, not
  just the default one, so a repo with an old push to some other branch
  could outrank a repo with a genuinely newer default-branch commit —
  showing e.g. "Moodzic" instead of "Pulse". Fixed by widening the query
  to `first: 10` and re-ranking the candidates by their actual
  `defaultBranchRef.target.committedDate` instead of trusting GraphQL's
  `pushedAt` ordering directly.
- **Steam widget outweighing GitHub**: Steam's cover art rendered as a
  tall single-column stack, which `page.tsx`'s `WIDGET_WEIGHT_OVERRIDE`
  compensated for by weighting it equal to GitHub's `lg` — meaning Steam
  visually dominated the flagship widget despite being a `size: "md"`
  card. Changed the games list from `flex flex-col` to a `grid
  grid-cols-1 sm:grid-cols-2` so two banners sit side-by-side on
  desktop/tablet, then removed the `steam` entry from
  `WIDGET_WEIGHT_OVERRIDE` entirely now that Steam's real height is back
  in line with its declared `md` size.
- **Profile menu/page showing the same identity twice**: the dropdown's
  name/email block linked to a `/profile` page that rendered nothing
  beyond that same name/email, just bigger. Replaced the `<Link
  href="/profile">` with a `<details><summary>View Profile</summary>`
  disclosure — the exact same in-place-expansion pattern `WidgetMenu`
  already uses for its "Settings" row — showing a compact avatar/name/
  email card inline in the dropdown instead of navigating anywhere.
  Deleted `apps/web/src/app/profile/page.tsx` entirely; nothing else
  referenced the route.
- **Quote click felt slow, not instant**: `cycleHeroQuoteAction` was
  calling `revalidatePath("/")` after cycling the quote — appropriate for
  `refreshWidgetAction`/`refreshAllWidgetsAction` (which legitimately
  change data other widgets reflect), but overkill for a quote-only swap,
  since it forced every widget on the dashboard to re-render and re-read
  its cache from Supabase just to show one new sentence. Removed the
  `revalidatePath` call entirely; the action now returns the new quote
  text directly in `WidgetActionState` (`quote?: string`, a Hero-only
  field alongside the existing Hero-only `cycleQuote` action), and
  `QuoteButton` renders `state.quote ?? quote` straight from
  `useActionState` — no page-wide re-render needed. The cache write still
  happens (so cron/full refreshes stay in sync), it's just no longer
  gating what the click shows.

## 2026-07-27 — Memory/Timeline feature, Milestone 1

A "memory" system was pitched: widgets log meaningful changes as small
events, powering a Timeline now and, much later, retrieval for an "Ask
Pulse" AI assistant — memory built first, assistant built last. Full
milestone breakdown lives in the new `docs/MEMORY_ROADMAP.md` (its own
M1-M4 track, deliberately not reusing `docs/ROADMAP.md`'s Phase 0-4
numbering to avoid colliding with that unrelated roadmap). This entry
just records the two decisions made before building M1:

- **New `memories` table, not the reserved `widget_events`.** The schema
  already has a `widget_events` table (`supabase/migrations/
  0001_core_schema.sql`), but it's earmarked for a different, still-
  undesigned feature: a pub/sub event bus letting widgets react to each
  other in real time (`docs/PROJECT_REFERENCE.md` §5/§20 — e.g. starting
  a focus session pausing Spotify), deferred until 2-3 widgets actually
  need it. Writing memory events into that table now would conflate two
  different concepts under one schema and pre-commit the event bus's
  eventual (unspecified) shape to whatever the memory log happens to
  need today. `memories` (`supabase/migrations/0003_memories_table.sql`)
  is separate on purpose. This doesn't conflict with §16's "AI assistant"
  Phase-1 non-goal — only the assistant itself (M4) is excluded, not the
  underlying event log.
- **Diffing, not logging every fetch.** The original write-up implied
  writing an event on every widget fetch. GitHub refreshes every 30
  minutes, Spotify/Steam every 3 hours (cron-driven, `docs/DECISIONS.md`'s
  2026-07-20 entry) — logging unconditionally would flood the table with
  near-duplicate rows saying nothing changed. `Widget.deriveMemories`
  (`packages/sdk/src/widget.ts`) is a pure diff against the previous
  cached snapshot, called from `refreshWidget`
  (`apps/web/src/lib/refresh-widget.ts`) — the single choke point already
  shared by cron, manual refresh, and settings-save, so every refresh
  path gets memory generation for free without a separate pipeline. This
  also makes generation naturally idempotent: once a change is reflected
  in the cache, the next cycle's diff against it won't re-fire the same
  event.

M1 ships with `deriveMemories` implemented for GitHub (new commits, new
repos), Spotify (top artist changes), and Steam (new games, playtime
sessions ≥15 min) — plus a Timeline page (`apps/web/src/app/timeline/
page.tsx`) grouping events into Today/Yesterday/Last Week/by-month,
linked from the profile menu. Hero deliberately has no `deriveMemories`;
greeting/weather/quote aren't memory-worthy content.

## 2026-07-27 — Dark mode removed entirely

The 2026-07-24 entry ("Dark mode.") deliberately kept a `dark:` fallback
(a straight tonal inversion via `prefers-color-scheme`, amending
reference doc §7 to mean "doesn't break," not "actively designed") rather
than deleting it outright. A request has now come in for it to be removed
completely — that earlier decision is superseded, not an oversight if a
future reader finds no dark-mode code left.

Removed: the `@media (prefers-color-scheme: dark)` block in
`apps/web/src/app/globals.css` (the only place dark-mode CSS variables
were defined), and every `dark:*` Tailwind class across `apps/web`,
`packages/ui`, and `packages/widgets/hero` (~10 files, ~15 occurrences —
plain deletions, no logic changes since removing a `dark:` variant just
leaves the light-mode class as the only one). There was never a
`next-themes`/`ThemeProvider`/manual toggle to also remove — dark mode
was OS-preference-only.

Updated `docs/PROJECT_REFERENCE.md` §7 and `docs/DESIGN_SYSTEM.md` to
drop the "dark mode as fallback" language, and `CLAUDE.md`'s definition
of done (it referenced §7's dark-mode line directly). Pulse is light-only
going forward — if dark mode is wanted again later, it should be a
deliberate, actively-designed second theme, not a resurrected fallback.

## 2026-07-29 — Pull-to-refresh, refresh-all latency, and a widget_cache race

The app was reported feeling laggy (refresh-all and the `/tasks`/`/notes`
"view all" pages taking a few seconds) plus newly-added tasks/notes
occasionally disappearing and reappearing after a reload, and separately
a request for mobile pull-to-refresh. Traced all three:

- **Pull-to-refresh**: no gesture library existed anywhere in the
  monorepo, and the touch math needed (track `touchstart` Y only from
  `window.scrollY === 0`, measure `touchmove` delta, fire on `touchend`
  past a threshold) is small — hand-rolled as
  `packages/ui/src/use-pull-to-refresh.ts` rather than adding a
  dependency, following `use-dismissable-menu.ts`'s existing hook
  pattern. Wired into `apps/web/src/app/refresh-all-title.tsx` via the
  same `formRef.current?.requestSubmit()` call `maybeAutoRefresh` already
  used, so no action-calling logic is duplicated. Added
  `overscroll-behavior-y: contain` to `body` in `globals.css` so the
  browser's own native pull-to-reload doesn't fire alongside it.
- **Refresh latency**: `apps/web/src/lib/refresh-widget.ts`'s
  `refreshWidget` awaited `readWidgetCache` and `widget.fetchData`
  sequentially, even though `readWidgetCache`'s result (`previous`) isn't
  used until after `fetchData` resolves (only for `deriveMemories`).
  Changed to `Promise.all([...])` — a needless serial round trip removed
  from every widget's refresh, on top of `refreshAllWidgetsAction`'s
  existing (and already correct) `Promise.allSettled` across widgets.
- **The disappear/reappear bug**: `writeWidgetCache`
  (`packages/database/src/widget-cache.ts`) was a blind last-write-wins
  `upsert`. `refreshWidget(TASKS_WIDGET_ID, userId)` for the same user can
  run concurrently from independent triggers that race each other — a
  user's own post-mutation refresh (`apps/web/src/app/actions/tasks.ts`),
  the cron scheduler (every 30 min), and `refreshAllWidgetsAction`'s
  auto-trigger on tab focus (`RefreshAllTitle`'s `maybeAutoRefresh`,
  every 5+ min). If a background refresh read `tasks` *before* a user's
  insert committed but its cache write landed *after* the user's own
  write, it silently overwrote the fresher cache row with a stale one —
  the new task vanished until the next refresh cycle re-wrote current
  data. Same class of bug `accounts.ts`'s
  `updateProviderAccountTokenIfCurrent` already guards against for OAuth
  token refreshes; applied the same compare-and-swap idea to
  `writeWidgetCache` via a new optional `readAsOf` parameter — the caller
  passes the time it started reading its source of truth, and the write
  only applies if the existing row is older than that, falling back to an
  `ignoreDuplicates` insert otherwise so a fresher concurrent write is
  never clobbered. `refreshWidget` now passes this; callers with no
  meaningful read time to guard (e.g. hero's `cycleQuote`) can omit it and
  keep the previous unconditional-upsert behavior.
- **`/tasks`/`/notes` page latency**: traced to `auth()`'s
  `session: { strategy: "database" }` (`packages/auth/src/config.ts`)
  doing a real Supabase session-lookup round trip on every page/action
  call, not a cheap JWT decode. This is an existing, intentional
  architecture choice used everywhere in the app already — left alone
  here; switching session strategy would be a real architectural change
  warranting its own discussion, not a silent fix folded into a
  performance pass.

## 2026-07-29 — `apps/web` gets its own test suite

Asked for an overall stability assessment ahead of adding more widgets.
The biggest concrete gap: every widget package and `packages/ui`/
`packages/database` have Vitest unit tests, but `apps/web` itself — the
dashboard shell most likely to break as widgets are added (column-
balancing layout math, every server action) — had none, only Playwright
e2e for signed-out pages.

Added `apps/web`'s own `test` script (`vitest run`, `apps/web/vitest.config.ts`,
node environment, `@/*` alias resolved manually since Vitest doesn't read
`tsconfig.json`'s `paths`) and two suites:

- `apps/web/src/lib/balance-columns.test.tsx` — extracted `balanceColumns`
  (and its `ColumnItem`/`WIDGET_WEIGHT`/`WIDGET_WEIGHT_OVERRIDE`
  companions) out of `page.tsx` into their own module so this pure layout
  math is testable without pulling in `page.tsx`'s Server Component tree
  (auth, Supabase clients, widget registration side effects). `page.tsx`
  now just imports it — no behavior change, pure extraction.
- `apps/web/src/app/actions/tasks.test.ts` — covers `addTaskAction`/
  `toggleTaskAction`/`deleteTaskAction`'s auth guard, validation, the
  success path (DB write → `refreshWidget` → `revalidatePath`), and error
  surfacing, mocking `@/auth`, `@pulse/database`, `@/lib/refresh-widget`,
  and `next/cache` the same way `packages/database`'s tests mock
  `./client`.

Follow-up pass added the remaining actions/lib coverage using the same
mocking pattern: `actions/notes.test.ts`, `actions/hero.test.ts`,
`actions/widgets.test.ts` (`refreshWidgetAction`/`updateWidgetSettingsAction`,
plus `refreshAllWidgetsAction`'s per-widget `"{name}: {reason}"` error
aggregation and its `Promise.allSettled` isolation — the exact behavior
central to the disappearing-task investigation), and
`lib/refresh-widget.test.ts` (the `Promise.all` concurrency + `readAsOf`
guard from the widget_cache race fix, `deriveMemories` wiring, and that a
failing memory write never fails the refresh itself). `apps/web` now has
45 unit tests across 6 files, on top of its existing signed-out Playwright
e2e suite.

## 2026-07-29 — GitHub heatmap expanded to a full calendar year

A question came up whether the GitHub widget's contribution heatmap could match
GitHub's own profile graph: full Jan–Dec, month/weekday labels, a
Less→More legend, an annual total, hover tooltips, and a mobile tap
popup. This is a deliberate departure from `docs/redesign-reference/`,
whose own mockup JS generates exactly the previous compact 20-week grid
with none of the above — confirmed first, per CLAUDE.md's
design-fidelity rule, before building. Detail level for the hover/tap
popup was also decided explicitly: **count only** (`"N contributions on
Month Day"`), not a commits/PRs/issues breakdown — the latter would need
a live per-tap GraphQL call with its own latency/failure surface, for a
benefit the reference screenshots don't even show.

**Adapter simplification, not just a feature add.**
`packages/adapters/github/src/contributions.ts`'s `fetchContributions`
used to fire two parallel GraphQL queries: a 20-week trailing window (for
the heatmap and today/this-week numbers) and a separate Jan-1-to-now
query whose per-day data was discarded, keeping only its `.total`.
GitHub's `contributionsCollection.contributionCalendar` field already
returns exactly the per-day `{date, count, level}` shape a full-year
heatmap needs, is capped at one year of range (a calendar year fits
exactly), and needs no OAuth scope beyond the already-granted
`read:user` — so this became **one** query (Jan 1–Dec 31 UTC) instead of
two, removing a whole request/response round trip and API rate-limit
unit per refresh. GitHub returns future dates as zero-count/level-0 days
directly (no client-side padding needed) — exactly the "blank Aug–Dec"
behavior in the reference screenshots used for a year still in
progress. `totalToday`/`totalThisWeek` now derive from the real "today"
entry in that array (filtering to `date <= today` first) rather than
simply the array's last element, which is now Dec 31, not today.

**Streaks got more accurate for free.** `computeStreaks` was bounded to
whatever window it was given — with a full year now available instead of
20 weeks, `longest` is accurate for the whole calendar year instead of a
rolling ~140-day slice. Its "today hasn't happened yet, don't break the
streak" special case assumed the array's last element was always today;
now that the array is padded through Dec 31, `computeStreaks` takes an
injectable `today` param (defaults to `new Date()`) and filters to
past-or-today days first, so a future zero-count day can never be
mistaken for "not yet logged."

**New pure helper, not inline JSX math.** `computeMonthLabels`
(`packages/widgets/github/src/heatmap-layout.ts`) figures out which
week-column each month's 1st day falls in — extracted the same way
`apps/web/src/lib/balance-columns.tsx` was, so this date/index math is
unit-testable (leap years, year-boundary padding) without rendering
anything.

**Hover/tap popover kept local, not added to `packages/ui`.**
`use-day-popover.ts` is a small hand-rolled hook (one shared `openDate`
state for the whole grid, not one `useDismissableMenu` instance per
day cell) following `use-pull-to-refresh.ts`'s precedent: no new
dependency, and — per the same anti-premature-abstraction reasoning
`useDismissableMenu` itself followed (extracted to `packages/ui` only
after being duplicated twice) — kept inside the GitHub widget package
since there's only one consumer so far. Extract later if a second widget
wants the same interaction.

**Layout**: switched from a flex-of-flex-columns to CSS grid
(`grid-auto-flow: column`) so month labels and weekday labels could
align against it; wrapped the day grid in a horizontal-scroll container
rather than shrinking ~53 weekly columns to illegibility on narrow
screens (matching how GitHub's own graph behaves on mobile). The
heatmap/activity-summary chip in `component.tsx` now stacks vertically at
every breakpoint instead of sitting side-by-side at `lg` — the fuller
heatmap is wide enough to fill that space on its own, consistent with
`docs/PROJECT_REFERENCE.md`'s "cards size to their own content" rule
already in place elsewhere.

Added `vitest`/Testing Library test setups to both `packages/
adapters/github` and `packages/widgets/github` (neither had a `test`
script before) — 5 new adapter tests and 27 new/updated widget tests
(streaks, month-label math, the popover hook, and a `Heatmap` component
smoke test covering the total line, legend, and hover/tap popover text).

## 2026-07-30 — GitHub heatmap: no-scroll layout, click-only popover

Real bugs were caught in the first pass above by looking at it live: a
horizontal *and* vertical scrollbar appeared (the horizontal-scroll
choice from 2026-07-29 was wrong — the reference expects the full year
visible with no scrolling at all, cells shrinking instead), the hover
popover was invisible in practice (clipped by that same scroll
container), its background was transparent instead of opaque, and it
duplicated the native `title` tooltip. There was also an explicit request for
"no hover effects... follow previous heatmaps," i.e. drop the
custom hover-triggered popover entirely — the original 20-week heatmap's
only hover hint was the bare native `title` attribute.

Before making any fix, built a throwaway Playwright+Vite harness
(`packages/widgets/github/.preview/`, never committed) that renders the
real `Heatmap` component with fixture data and real Tailwind CSS —
outside `apps/web`, no Supabase/GitHub OAuth credentials needed, since
these bugs are pure rendering issues in one component. This let the
prior diagnosis be confirmed empirically (measured
`containerOverflowY: "auto"`, the popover's bounding rect literally
below the scroll container's own bottom edge, `backgroundColor:
"rgba(0,0,0,0)"`) instead of staying a code-reading guess — and caught a
second live-only bug during the fix itself (see below). Worth
remembering as a technique: component-level UI bugs don't need a signed-
in `apps/web` session to verify, just a way to render the component in
a real browser with synthetic data.

**No-scroll layout**: replaced the fixed-`CELL_PX` + `overflow-x-auto`
grid with cell sizing computed by the browser via CSS container query
units (`cqw`), not JS measurement — `container-type: inline-size` on the
row wrapping both the weekday-label column and the day grid, with
`cellSize = calc((100cqw - labelColumnWidth - gaps) / columnCount)`. This
always exactly fills the available width with zero overflow, at any
card/viewport width, with no `ResizeObserver`/JS recompute and no
hydration flash. Verified via the harness at 760px/500px/340px card
widths: `scrollWidth === clientWidth` and no `hasVScroll` at every size.

**A second live-only bug found while building this fix**: an initial
attempt gave the weekday-label column its own independent `cqw`-based
row heights, reasoning that flexbox `align-items: stretch` (the row's
default) would make it match the day grid's rendered height. Live
screenshots showed Wed/Fri rendering nowhere near their real grid rows.
Measured why: `cqw` only resolves correctly for *descendants* of the
element declaring `container-type` — the label column was a *sibling* of
that element, so its `cqw` resolved against a different (wrong) ancestor
context entirely, and separately, flexbox stretch doesn't shrink an
intrinsically-taller sibling (the label text's minimum legible
line-height) to match a shorter one — it grows the shorter one to match
the taller, which silently broke the row alignment instead. Fixed by
moving `container-type: inline-size` up to the single row wrapping both
the label column and the grid, and writing `cellSize`'s formula to
subtract the label column's own fixed width from that shared `100cqw`
budget — so both the label row heights and the grid's own cell size are
computed from the exact same query context and never disagree. This is
the kind of layout bug that's very hard to catch from reading the JSX
alone (the code looked reasonable) and exactly why the harness was
worth building before considering the fix done.

**Popover**: dropped `onMouseEnter`/`onMouseLeave` and the `hoveredDate`
state entirely — the popover now opens only on click/tap (also
naturally serving as the mobile tap-to-see-detail interaction from the
original ask), toggling closed on a second click. The native `title`
attribute stays as the only hover hint, matching the original heatmap.
Switched the popover's background from a hand-rolled `GLASS_CHIP` +
`bg-[var(--background)]` combination (whose two `bg-*` utility classes
had equal specificity, and `bg-transparent` from `GLASS_CHIP` silently
won) to `glassClass("light")`, which already provides the correct
opaque background/border/shadow with nothing to conflict.

Updated `heatmap.test.tsx` to assert hover produces no popover and
click toggles it open/closed, replacing the old hover-based test.

## 2026-07-31 — Notebook widget: a second user-authored-content pattern, and autosave upsert

Added the Notebook widget: a freeform, untitled entry stream — "a
digital pocket notebook" — distinct from the existing Notes widget
(titled, editable, delete-able list). No tags, folders, search, edit, or
delete in v1; the person just types, and pausing autosaves.

**Persistence — confirms, doesn't establish, the own-table precedent.**
Notes and Tasks already write to their own Postgres tables
(`notes`/`tasks`) rather than the generic `widget_cache` JSON blob used
for externally-fetched data — that split (own table for genuinely
relational/queryable user-authored content vs. `widget_cache` for
adapter-fetched external data) was real prior art, just never written
down as its own decision. Notebook follows it exactly: a new
`notebook_entries` table (`supabase/migrations/0005_notebook_entries_table.sql`),
`packages/database/src/notebook.ts` with the same
`create/update/list` + `service_role`/`user_id`-filter shape as
`notes.ts`. `fetchData()` still goes through the normal cron-first path
(`widget_cache` caches the *read* of `notebook_entries`, same as Notes) —
only the write side bypasses `widget_cache`.

**Autosave is an upsert while composing, not "one entry per pause."**
The spec's "do not auto-append to the most recent existing entry" could
be read two ways: (a) every debounced pause creates a new entry and
clears the box, or (b) the input box is a single "living draft" —
pausing updates that same entry in place, and only clearing the box (or
never having typed yet) starts a new one. Went with (b), confirmed
before building: typing a paragraph with natural mid-sentence pauses
should stay one entry, not fragment into several. "Do not auto-append to
the most recent existing entry" refers to *old, already-closed* entries
from a previous session — not the entry currently being composed.

This needed a small extension to the shared SDK contract:
`WidgetActionState` (`packages/sdk/src/widget.ts`) gained an optional
`entryId?: string` field, alongside the existing `error`/`quote`
(Hero-only) fields — `addEntryAction` returns the newly created row's id
so the client can track it as the open draft and call `updateEntryAction`
on subsequent pauses instead of creating a new row each time. First
widget besides Hero to extend that shared type.

Also first widget to call a `useActionState` dispatch function
(`addFormAction`/`updateFormAction`) directly from a `setTimeout`
callback rather than via `<form action>` or a click handler. React
requires that call to happen inside `startTransition` when it's not
triggered by a real form submission/action prop — omitting it doesn't
throw, but silently breaks `isPending` tracking and logs a runtime
warning (caught via a throwaway preview harness — see below — not from
reading the code, since the failure is silent otherwise).

**No settings, no full-page view — both deliberate scope calls, not
oversights.** Notebook is the second widget (after Hero) to claim
CLAUDE.md §7's "no per-user configuration" exemption — confirmed
first, since only one other widget had ever claimed it. It also
skips the `/notes`-style full-page "view all" route Notes has: the spec
caps rendering at the last 10 entries with older ones simply not shown
(still stored, not a browsable archive), and nothing in the spec asked
for a browse-everything page — adding one would have been scope beyond
what was requested.

**Empty state is the textarea's own placeholder, not a bolted-on
`EmptyState`.** The input area is always-present real content (never a
contentless card), so the "quiet italic serif line" the spec asks for
lives on the textarea's `placeholder` attribute (`font-body italic`,
muted) rather than the shared `EmptyState` component rendered
underneath it. Confirmed as the intended reading of "empty/
prompt state" for this specific widget shape, rather than assumed.

**Verified without live Supabase/OAuth credentials**, same technique as
the GitHub heatmap fix (see 2026-07-30 entry): a throwaway page under
`apps/web/src/app/` (never committed) rendered `NotebookCard` directly
with fixture entries and no-op actions, run through the real dev server
so real Tailwind CSS applied. Caught the `startTransition` bug above via
the dev overlay's console warning, confirmed the fade opacity ramp,
italic placeholder, no-border textarea, and the autosave dot's
appear/linger/fade behavior by screenshotting mid-debounce, and checked
390px/900px widths for overflow — before deleting the scratch route.

## 2026-07-31 — Notebook follow-up: manual-migration gotcha, "View all" page

Two fixes on top of the Notebook widget (see the entry above).

**"Could not find the table 'public.notebook_entries'" on the live
app.** Not a code bug — this repo has no automated migration pipeline
(confirmed: no workflow runs `supabase db push`/`migration up`, no
`supabase/config.toml` linking a project). Migrations are applied by
hand, pasting each file into the Supabase Dashboard's SQL Editor in
filename order (same process 0002's own comment already warns about —
see that migration's note about `service_role` grants). Migration 0005
was committed but never run against the live database, so the table
genuinely didn't exist. Fixed by running it manually; no code changed
for this half. Worth remembering for every future migration: committing
the file is not the same as applying it here.

**Added `/notebook`, a "View all" history page**, matching `/notes` and
`/tasks`'s existing shell (`ArrowLeft` "Dashboard" back link, `font-
heading text-2xl` title, no `WidgetCard` chrome, auth-gated). The
original spec deliberately left this out (cap at 10, older entries
"still stored, just not shown," no browse UI) — added now on explicit
request, superseding that scope note.

The one real wrinkle: Notes/Tasks' full pages read history via
`readWidgetCache(...)` because their `fetchData()` has no row limit, so
the cache already holds everything. Notebook's `fetchData()` calls
`listNotebookEntries(userId, RENDER_LIMIT)` (`RENDER_LIMIT = 10`), so
its `widget_cache` row only ever holds the 10 most recent entries —
reusing `readWidgetCache` on `/notebook` would have silently capped
"view all" at 10, defeating the point. Fixed by making
`listNotebookEntries`'s `limit` parameter optional (`packages/database/
src/notebook.ts`) — omitted entirely, it skips `.limit()` and returns
full history — and having `/notebook/page.tsx` call it directly,
unbounded, instead of going through the cache. `fetch.ts` (the widget's
actual `fetchData()`) is unchanged, still passing `RENDER_LIMIT`.

Also added the "View all →" link to the dashboard card (same style as
Notes'), and `revalidatePath("/notebook")` alongside the existing
`revalidatePath("/")` in both `addEntryAction`/`updateEntryAction`, so
edits from either surface show up instantly on both.

## 2026-07-31 — Notebook: fix /notebook crash, duplicate entries, and revalidation storm lag

Three real bugs found after PR #70 shipped, reported live (screenshots
from the actual deployed app): the new `/notebook` page crashed with
Next's generic "Something went wrong" boundary, the card showed the same
entry twice, and the whole dashboard felt laggy while typing in Notebook.

**Crash**: `apps/web/src/app/notebook/page.tsx` is an async Server
Component. It rendered `<NotebookInput onPendingChange={() => {}} />` —
a plain closure passed directly from a Server Component to a Client
Component. Next.js can only serialize Server Actions (functions marked
`"use server"`) across that boundary, not arbitrary closures; anything
else throws immediately during RSC serialization, which is exactly what
surfaced as the generic root `error.tsx` boundary. Missed in the
original PR because the throwaway preview harness used to verify
`/notebook` rendered `NotebookCard`/`NotebookInput` directly from a
`"use client"` scratch page — never through an actual Server Component,
so it couldn't reproduce a server/client boundary bug by construction.
Fixed by making `onPendingChange` optional on `NotebookInput` (defaulting
to a no-op internally via `onPendingChange?.(pending)`) and simply not
passing it from `/notebook/page.tsx` at all — `notebook-card.tsx` (which
*is* a Client Component) is unaffected and still passes a real callback.
Reverified this specific class of bug by reproducing the exact
Server-Component-renders-NotebookInput shape in a second throwaway
route — the lesson being that a preview harness needs to match the
*real* rendering context (server vs. client boundary), not just the
visual output, or it can pass while the real page still crashes.

**Duplicate entries**: the autosave upsert (see 2026-07-31's first
Notebook entry) tracks the in-progress entry's id in a ref, set only
once the create request's response comes back. Nothing stopped a second
debounce firing — and calling `addEntryAction` a second time — while the
first was still in flight, since `draftIdRef` was still `null` at that
point. Two `addEntryAction` calls for the same "thought" raced, and both
succeeded, producing two entries. Fixed with a synchronous `savingRef`
in `notebook-input.tsx`: set `true` right before dispatching a save,
cleared once the action's pending state settles; a debounce that fires
while a save is already in flight now retries shortly instead of firing
a second, concurrent request. (A plain `pending` boolean from
`useActionState` wasn't enough here — it only updates after a render
commits, leaving a real window for a second `setTimeout` to fire first;
a ref gives synchronous truth at the exact moment the timer callback runs.)

**Revalidation storm**: `updateEntryAction` — which fires on *every*
autosave pause while composing a longer entry, not just once — was
calling `refreshWidget()` (its own extra DB round-trip) and
`revalidatePath("/")` on every single save. `revalidatePath("/")`
invalidates the whole dashboard's router cache, so every widget
(GitHub, Steam, Spotify, Tasks, Notes, Hero) re-fetches on the next
render — multiplied by however many pauses one entry took to write.
Fixed by having `updateEntryAction` skip both entirely: the DB write
alone is fully durable, and the dashboard card's copy of that entry
catches up via the widget's existing 15-minute cron backstop or the
next `addEntryAction` (which still does the full refresh, since it's
infrequent — once per new entry, not once per pause). Kept the cheap
`revalidatePath("/notebook")` so the full history page doesn't go stale
for long. `addEntryAction` is unchanged.

## 2026-08-01 — Calendar, Email, Focus timer, and YouTube permanently removed from scope

A project status/bug audit surfaced real documentation drift:
`docs/ROADMAP.md` still described Tasks as "skipped" and Phase 2 as "Not
started," while Tasks, Notes, and Notebook (all write-back-to-own-table
features — exactly what Phase 2 was scoped to be) were already built and
live. Separately, it was confirmed the Google Calendar,
Gmail, focus timer, or YouTube widgets will never be built — these were sitting in
`docs/PROJECT_REFERENCE.md`/`docs/ROADMAP.md` as "deferred"/"blocked,"
which reads as still-open, not decided against.

Distinct from the earlier 2026-07-22 rescoping (`docs/DECISIONS.md`,
that date's entry) — that pass deprioritized these for *sequencing*
reasons ("aren't useful to build next"); this one is a permanent scope
decision ("won't ever build these"). Updated both docs throughout
(`PROJECT_REFERENCE.md` §9-§12, §18; `ROADMAP.md`'s Phase 1 rescoped list
and Phase 2 section) to reflect both changes — see `docs/ROADMAP.md`'s
matching "Documentation accuracy pass" entry for the itemized list.

One nuance preserved carefully: "Calendar (date display)" — a separate,
already-built plain-local-date widget that later merged into Hero — is
unrelated to the removed Google Calendar *integration* and happens to
share the word "Calendar." Not affected by this removal; called out
explicitly in both docs to avoid future confusion between the two.

`focus_sessions` (the Supabase table created for the now-removed focus
timer in `0001_core_schema.sql`) is left in place, unused — rolling back
a migration is a real schema change with its own risk, out of scope for
a documentation-accuracy pass. Noted as unused in
`docs/PROJECT_REFERENCE.md` §8 rather than silently left unexplained.

## 2026-08-01 — Dashboard polish: GitHub, Steam, Spotify, Notes

The live dashboard was reviewed with four changes requested. Two revert
decisions that were explicitly confirmed before — legitimate changes of
mind, not silent overwrites, so recorded here like every other decision,
with a pointer back to what they revise. All four confirmed via
`AskUserQuestion` before implementation.

**GitHub heatmap chip: hover fill removed, hover border kept.** Not the
whole-card hover cue (`GLASS_HOVER` on `WidgetCard`, from the 2026-07-25
"static, non-motion hover" decision) — that's untouched and still
applies to every widget card, GitHub included. This is specifically
`GLASS_CHIP`'s background-tint-on-hover (`hover:bg-[color-mix(...)]`),
which was applied to the heatmap's own wrapper chip. `GLASS_CHIP` is
shared with Quick Launch's tiles and other chips, so rather than editing
that shared token (which would've changed those too), the heatmap's
wrapper now uses a small local class string in
`packages/widgets/github/src/component.tsx` — border-brightens-on-hover,
no fill — with everything else about `GLASS_CHIP` left alone.

**GitHub "latest repo/commit" row removed** (the "Moodzic" row) — it
was found cluttered, not useful. Removed the render block, the
`fetchLatestActivity` call in `fetch.ts`, the `latestActivity` field
from `githubDataSchema`/`GitHubData`, and the adapter module
(`packages/adapters/github/src/activity.ts`) entirely — no other
consumer existed. Real trade-off worth naming: `derive-memories.ts`'s
"new commit" Memory/Timeline signal read `latestActivity`, so that
signal is gone too (the `repositoriesCreated` signal is unaffected).
Kept as an accepted cost rather than fetching data solely to feed an
under-the-radar Timeline entry nobody asked to keep.

**GitHub heatmap: full year → compact recent-weeks strip** (reverses
2026-07-29's "expand to full calendar year" decision — see that entry
and 2026-07-30's follow-up for the original reasoning). In a narrow
dashboard card, ~53 weeks of mostly-empty grey squares buried the
actual recent activity in a tiny sliver on the right edge — legible on
GitHub's own wide profile page, not in a card. Fixed client-side only:
`RECENT_WEEKS_COUNT = 12` in `constants.ts`, and `component.tsx` now
passes `data.weeks.slice(-RECENT_WEEKS_COUNT)` to `Heatmap` instead of
the full array. `Heatmap`'s cell-sizing (`cqw`-based, `columnCount =
weeks.length`) and `computeMonthLabels` both already operate generically
on whatever `weeks` they're given, so no changes needed there. The
adapter (`packages/adapters/github/src/contributions.ts`) is untouched —
still one full-year query per refresh, keeping the round-trip
simplification from 2026-07-29 and the accurate `totalThisYear` count
that still appears as header text even though the grid only renders
recent weeks.

**Steam and Spotify: compact thumbnail + text rows.** Confirmed first
that a widget's `size` field (`sm`/`md`/`lg`) doesn't control physical
card dimensions — layout is two weight-balanced flex columns (see the
2026-07-26 "Layout/UX fixes" entry), not a CSS grid span — so the fix
had to be trimming content, not the `size` prop.
- Steam (`packages/widgets/steam/src/component.tsx`): the 2-column grid
  of full-width 16:9 cover-art tiles became a vertical list of rows — a
  small fixed-width (`w-16`) thumbnail beside the title, matching
  Spotify's existing row shape. `cover-art.tsx` itself is unchanged
  (still fills whatever width its parent gives it); it's also used at
  full width on the Steam detail page
  (`apps/web/src/app/steam/[appId]/page.tsx`), which this doesn't touch.
- Spotify (`packages/widgets/spotify/src/component.tsx`,
  `constants.ts`): `TRACK_LIMIT` 5 → 3, row/section spacing tightened
  (`gap-4` → `gap-2`), top-artist avatar 48px → 36px with its separate
  "TOP ARTIST" label line dropped so it reads as one compact header row
  instead of its own section.

**Notes page: inline-editable list → click-to-open modal.** The /notes
page previously rendered every note as an always-editable inline
title+body form — not a real way to browse history. Now: a
compact read-only row (title + truncated snippet, reusing the
`snippet()` helper — extracted to `packages/widgets/notes/src/
snippet.ts` since it's now shared between the dashboard card's
`NoteRow` and the new `NoteListRow`) that opens a detail/edit modal on
click; "+ New note" opens the same modal in create mode instead of an
always-visible form taking up page space.

This needed **Pulse's first modal/dialog primitive**
(`packages/ui/src/modal.tsx`) — nothing like it existed (`WidgetMenu`'s
dropdown is an anchored disclosure panel, not a centered overlay with a
backdrop). Built to match Classical exactly: flat scrim backdrop (no
blur — "no backdrop blur anywhere in the system" per
`docs/DESIGN_SYSTEM.md`), `glassClass("heavy")` + `RADIUS.card` panel
(the same "floats above the page" treatment `WidgetMenu`'s dropdown
already uses), `font-heading` title. Closes on Escape or a backdrop
click (not a click inside the panel), focuses the panel on open, and
returns focus to whatever triggered it on close — the same bar of
a11y effort `useDismissableMenu` already set for dropdowns, not a full
focus-trap (nothing else in this codebase has one either). Has its own
test suite (`modal.test.tsx`) mirroring `use-dismissable-menu.test.tsx`'s
shape.

`packages/widgets/notes/src/note-modal.tsx` is one component for both
create and edit — `note` prop present/absent switches which server
action it submits to (`updateNoteAction`+`deleteNoteAction` vs.
`addNoteAction`) and whether timestamps/delete show. A successful save
keeps the modal open (edit mode, so you can keep tweaking) or closes it
(create mode, matching the old `AddNoteForm`'s reset-after-success
behavior). A successful delete always closes it. `notes-page-body.tsx`
(new, in the widget package — same "client composition component lives
beside its widget" pattern as `notebook-card.tsx`) holds the open/closed/
which-note state and wires it all together; `apps/web/src/app/notes/
page.tsx` is back to a thin server shell, and `note-editor.tsx` (the old
always-inline editor) is deleted. The dashboard card's own preview
(`component.tsx`, `NoteRow`) is unchanged — it was already read-only +
a delete button, so it didn't have the problem being fixed; the ask was
specifically about the `/notes` page.

Verified via the same throwaway-preview-route technique as previous
passes (uncommitted, deleted after): screenshotted all four widgets,
confirmed the heatmap chip's hover shows a border with no fill, opened
the notes modal in both edit and create mode, and confirmed no
console/hydration errors.

## 2026-08-01 — Dashboard polish round 2: heatmap bug, Steam row, paired widgets, pinning

Follow-up to the same day's earlier "Dashboard polish" entry (PR #73).
Live screenshots surfaced a real bug and three more layout
requests, all confirmed via `AskUserQuestion` before implementation.

**GitHub heatmap bug, root cause and fix.** The compact-recent-weeks
change (this same day's earlier entry) did `data.weeks.slice(-RECENT_WEEKS_COUNT)`.
`data.weeks` is the full Jan 1–Dec 31 year, and — as
`packages/adapters/github/src/contributions.ts`'s own doc comment
already said — GitHub pads days *after today* into that array at count/
level 0, all the way through Dec 31. Slicing from the end of the array
grabbed the literal tail of the calendar year (November/December, pure
future padding), not the weeks actually leading up to today whenever
today isn't late in the year — exactly why the live card showed "Nov"/
"Dec" labels with every cell blank. Fixed with a new pure helper,
`selectRecentWeeks(weeks, fetchedAt, count)` in
`packages/widgets/github/src/heatmap-layout.ts` (alongside the existing
`computeMonthLabels`): filters to weeks containing at least one
past-or-today day *before* slicing the last N. Confirmed this
keeps the compact-strip approach rather than reverting to the full year.

**Steam: one row instead of stacked.** `packages/widgets/steam/src/
component.tsx`'s games list changed from `flex flex-col` (vertically
stacked rows) to `flex flex-row flex-wrap` — both (still capped at
`MAX_GAMES = 2`) games now sit side-by-side, wrapping to a second line
only if the card is too narrow. Thumbnail width trimmed `w-16` → `w-12`
to fit comfortably two-up in a half-width card (see next entry).

**Steam + Spotify paired into one row — first time two separate widgets
share physical row space.** Both noticeably under-used their column's
width on their own (compact rows in a column sized for GitHub's wide
heatmap), leaving visible empty space. `apps/web/src/app/page.tsx`'s
`WidgetGrid` now pulls both out of the normal per-widget flow and
renders them together as one `ColumnItem`:
```tsx
<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
  <WidgetCell widget={steamWidget} ... />
  <WidgetCell widget={spotifyWidget} ... />
</div>
```
weighted as a single `WIDGET_WEIGHT.md` (2) rather than the sum of both
— side-by-side, the pair now takes about as much vertical height as one
`md` widget, so summing would have over-weighted it in `balanceColumns`
relative to its real on-screen height (same reasoning
`WIDGET_WEIGHT_OVERRIDE`'s existing doc comment already established for
Steam once, back when its height didn't match its declared size).
`packages/widgets/spotify/src/index.ts` gained a `WIDGET_ID` export
(Steam's already had one) so `page.tsx` can find both by id. Collapses
to a single column below `sm:` — verified no overflow at mobile widths.
Both widgets are still fully independent (own fetch/cache/error
boundary/`WidgetCell`); only their layout placement is shared.

**Tasks/Notes/Notebook pinned to the top of the right column.** The
left/right split comes from `balanceColumns`
(`apps/web/src/lib/balance-columns.tsx`), a greedy weight-balancer with
no concept of "this widget matters more, put it first" — the goal was
Tasks (the most-checked widget) reliably at the top of the right column,
followed by Notes then Notebook, not wherever the weight math happened
to land it (today: Tasks was actually the *last* item in the left
column, since it was the widget that tipped the running weight just
past half). Rather than reorder the widget registry and hope future
size changes don't shift things again, `WidgetGrid` now pulls
`PINNED_RIGHT_ORDER = [TASKS_WIDGET_ID, NOTES_WIDGET_ID,
NOTEBOOK_WIDGET_ID]` out of the normal flow entirely and prepends them
to `right` in that exact order; `balanceColumns` runs unchanged on
everything else (GitHub, the Steam+Spotify pair, the "coming soon"
placeholders) and stays a simple, purely weight-driven function with
its existing unit tests intact — pinning is layered on top in
`page.tsx`, not inside the balancer. With current widget sizes this
settles into left = GitHub + the Steam/Spotify pair, right = Tasks,
Notes, Notebook, then Habits/Reading/RSS — matching the description.
Also reads better on the mobile single-column stack (which renders
`left` fully before `right`): GitHub → Steam/Spotify → Tasks → Notes →
Notebook → placeholders, instead of Tasks being interleaved with
Steam/Spotify like before.

Verified via the same throwaway-preview-route technique as previous
passes (uncommitted, deleted after): fixture GitHub data with real
future-padded days confirmed the heatmap now shows genuine recent
colored cells with correct month labels (no more blank Nov/Dec), and
the Steam+Spotify paired-row wrapper was screenshotted at desktop and
mobile widths — no overflow, no console/hydration errors.

## 2026-08-01 — GitHub heatmap: cells too big after the recent-weeks change

Real bug, found live right after the previous entry's fix shipped. The
heatmap's cell-size formula (`packages/widgets/github/src/heatmap.tsx`)
always filled 100% of the card's available width divided by the column
count, with no upper bound — tuned for the original full-year grid
(~53 columns), where dividing a card's width by 53 naturally produces
small cells. Once the column count dropped to 12 (the recent-weeks
strip from earlier this same day), the same width divided by far fewer
columns produced huge cells — each one roughly 8x GitHub's own cell
size, exactly what the live screenshot showed.

Fixed by capping cell size at `MAX_CELL_PX = 11` (matching GitHub's own
graph) via `min(fillToContainerWidth, 11px)` in the cell-size `calc()`.
Cells now render at a normal, fixed size on wide cards, leaving
unused width to their right rather than stretching to fill it — exactly
how GitHub's own compact heatmap looks. The `min()` still lets cells
shrink further on genuinely narrow viewports (mobile), so the "always
fits with no scrolling" property from the original `cqw`-based design
is unaffected — verified at both a wide desktop width and 390px mobile
via the same throwaway-preview-route technique as previous passes.

Also ran a full health check across the whole monorepo per request:
`pnpm lint`, `pnpm typecheck`, `pnpm test` (all 16 packages), `pnpm
build`, and `pnpm --filter @pulse/web test:e2e` all pass clean — no
other regressions found.

## 2026-08-01 — Dashboard layout architecture rebuild

A request came in to stop patching individual widgets reactively (this file's
last several entries: heatmap window size, heatmap cell size, Steam row
layout, Steam+Spotify pairing, Tasks/Notes/Notebook column pinning) and
rebuild the shared layout system itself, so every widget inherits the
same responsive behavior instead of accumulating one-off fixes.

**Root cause.** `apps/web/src/app/page.tsx`'s `WidgetGrid` was never
real CSS Grid — it was two independent flex columns (`sm:basis-2/3`/
`sm:basis-1/3`) populated by `apps/web/src/lib/balance-columns.tsx`'s
`balanceColumns()`, a hand-rolled JS weight-balancing heuristic
(`WIDGET_WEIGHT: {sm:1, md:2, lg:3, hero:0}`) that had to be
progressively special-cased as new requirements landed: a
`PINNED_RIGHT_ORDER` list layered on top for Tasks/Notes/Notebook, a
hand-built Steam+Spotify paired sub-grid. Every prior "fix" was really a
special case bolted onto a system that was never a real grid to begin
with.

**Fix: switch to fluid CSS Grid, DOM order = priority.** Replaced the
two-flex-column split with one real grid:
`grid-cols-[repeat(auto-fit,minmax(320px,1fr))]` inside a `max-w-6xl`
container. The browser now decides column count and reflow natively —
there's no JS weight algorithm to keep in sync as widgets are
added/removed. Visual priority is now just render order: Tasks → Notes
→ Notebook (the daily-input widgets, kept first) → GitHub → the
Steam+Spotify pair → the "coming soon" placeholders last.
`balanceColumns()`/`WIDGET_WEIGHT`/`WIDGET_WEIGHT_OVERRIDE`/
`PINNED_RIGHT_ORDER` are all deleted (`balance-columns.tsx` and its
test file removed entirely). **Trade-off, confirmed explicitly
via `AskUserQuestion` before implementing:** widgets no longer have
a guaranteed "always in this exact lane" placement — a fluid `auto-fit`
grid has no fixed left/right column concept — in exchange for genuinely
native responsive reflow. `lg`-sized widgets (GitHub, Notebook) get
`lg:col-span-2` so they span two tracks on wide widths; this naturally
clamps to the single available track on mobile with no separate
override needed.

**GitHub heatmap: removed the nested-card wrapper, restored the full
year.** `HEATMAP_CHIP` — a hand-copied near-duplicate of the unused
`GLASS_CHIP` token — wrapped the heatmap in its own bordered box inside
the widget's already-bordered `WidgetCard`, the one genuine
nested-card violation found across all seven widgets. Removed it; the
heatmap now renders directly as `WidgetCard` content with a plain
`flex flex-col gap-4` spacing wrapper, no border/bg/hover of its own.
Also reverted the widget to rendering `data.weeks` (the full Jan–Dec
year) instead of the `selectRecentWeeks(...)`-trimmed 12-week strip
from two entries above — an explicit reversal, direct
instruction this round ("show from jan to dec"). Removed the
now-dead `RECENT_WEEKS_COUNT` constant and `selectRecentWeeks` function
(plus its tests). The cell-sizing formula itself
(`min(fillToContainerWidth, 11px)` via a `cqw` container query, from
the entry above) is unchanged — it already scales cells to available
width while staying square and capped at a GitHub-like size, which is
exactly what a full 53-column year needs too.

**Steam+Spotify: stopped forcing equal heights.** The paired sub-grid
(`grid grid-cols-1 sm:grid-cols-2`) defaults to `align-items: stretch`,
and `WidgetCard`'s root has `h-full` — so the two cards were forced to
match heights regardless of actual content, contradicting "widgets grow
according to their content." Added `items-start` to the pairing
wrapper so each card sizes independently.

**New shared `cardShellClass()` helper
(`packages/ui/src/card-shell.ts`).** `WidgetCard`, `Skeleton`'s "card"
variant, and `ErrorState` each hand-typed a near-identical root
className (`flex flex-col gap-4`, `RADIUS.card`, `glassClass("light")`,
`h-full`) — three copies of the same shape, with only padding/min-height/
hover actually varying per caller. Consolidated into one parameterized
function; all three now call it instead of re-typing the class list.

**`WidgetCard` footer slot.** Tasks/Notes/Notebook's "View all →" links
previously sat as the last child inside each widget's own content
`flex-col` — visually similar across widgets by convention, not by
shared structure. Added a real `footer?: ReactNode` prop to
`WidgetCard`, rendered after the content `<div>` with a
`border-t border-[var(--color-divider)] pt-3` separator, and migrated
all three widgets onto it — "identical padding, header, content,
footer structure" is now actually true structurally.

**Audit of the rest.** Steam/Notes/Notebook/Spotify internals were
already flex-based throughout with no absolute-positioning misuse and
no other nested cards — every fixed dimension found is a legitimate
44×44px touch target or icon/avatar size, not a layout bug. These
didn't need internal rework beyond the footer-slot migration above.
`/notebook` (`apps/web/src/app/notebook/page.tsx`) was suspected dead
during the audit but turned out to already exist and work — a wrong
finding from one exploration pass, corrected before it became wasted
work; no changes needed there.

Verified via `pnpm lint`/`typecheck`/`test`/`build` (all clean) and the
established throwaway-preview-route technique (uncommitted, deleted
after: `getAllWidgets()` + `widget.render()` with fixture data for
every widget, mirroring `WidgetGrid`'s actual rendering path) —
screenshotted at desktop (1280px), tablet (820px), and mobile (390px).
Confirmed: the grid reflows with no fixed column count (3 columns →
2 → 1), no horizontal overflow at any width, GitHub spans two tracks
wide on desktop/one on mobile with the full year rendering border-free
and square, Steam and Spotify render side-by-side with independent
(non-stretched) heights on desktop/tablet and stack on mobile, and
Tasks/Notes/Notebook appear first in the flow at every width.

## 2026-08-01 — Dashboard layout: targeted fixes after a second audit

The dashboard was flagged (with live screenshots) as having regressed
since the previous entry's rebuild, with a request for a ground-up
redesign: an audit report, a dashboard-owns-sizing layout system,
semantic `S`/`M`/`L`/`XL` size tokens, and every widget refactored onto
it.

**Audit came back cleaner than expected.** Two parallel agents swept
the shared layout components and every widget's internals. Headline
finding: the architecture from the previous entry wasn't actually
broken — no nested-card violations survived anywhere, no widget defined
its own outer width/height fighting the grid, every widget already
rendered through the one shared `WidgetCard` shell. The real findings
were six narrow, concrete issues, not evidence of a fundamentally
broken system. Surfaced this via `AskUserQuestion` rather than
either blindly doing the full rename or silently downscoping — the choice was
targeted fixes over the full `sm/md/lg/hero` → `S/M/L/XL` rename (a
pure rename with no behavioral difference until sizes actually map to
different grid-span rules, which they don't yet — matches CLAUDE.md's
"don't scaffold ahead of need").

**Fixes shipped:**

1. **Grid could leave holes.** `auto-fit` computes column count from
   container width alone, blind to which items request
   `lg:col-span-2` — a span-2 widget (GitHub, Notebook) could land at
   a row's end and get squeezed instead of flowing to a new row. Added
   `[grid-auto-flow:dense]` to `WidgetGrid`'s grid className
   (`apps/web/src/app/page.tsx`) so the browser backfills earlier
   gaps with later single-track items.
2. **Dead `h-full` in the shared card shell.** `cardShellClass()`
   (`packages/ui/src/card-shell.ts`) carried an `h-full` left over
   from before the grid switched to `items-start` — inert today (no
   ancestor has a definite height to resolve against), and would
   silently start doing something different if `items-start` were
   ever removed. Deleted it.
3. **Hero's negative-margin bleed hack.** Hero cancelled `<main>`'s
   own `p-4 sm:p-6` with `-mx-4 -mt-4 ... sm:-mx-6 sm:-mt-6` to render
   full-width — two components had to stay numerically in sync by
   hand. Restructured instead: `<main>` no longer carries padding at
   all; the grid wrapper (`apps/web/src/app/page.tsx`'s `WidgetGrid`)
   now carries its own `px-4 pb-4 sm:px-6 sm:pb-6`, and the
   sign-out `<p>` in `page.tsx`'s `Home()` got the same padding
   directly. Hero is full-bleed by construction now, nothing to
   cancel.
4. **Skeleton/real-content height mismatch.** The loading skeleton's
   fixed placeholder-line heights didn't scale with how tall real
   widget content (GitHub, Notebook) grows to, so the loading→loaded
   swap could visibly jump height. Added a `min-h-64` floor and one
   more placeholder line to `Skeleton`'s "card" variant
   (`packages/ui/src/skeleton.tsx`) — a rough visual match, not
   pixel-exact (skeletons are approximate by nature).
5. **GitHub re-capped its own width.** `ActivitySummaryBlock`
   (`packages/widgets/github/src/component.tsx`) hardcoded
   `lg:max-w-56` on itself even though GitHub is `size: "lg"` and
   already gets a full doubled grid track from the grid wrapper —
   duplicated, competing sizing logic between the widget and the
   grid. Removed the cap; the block now just uses the track width
   it's already been given.
6. **Number-legibility bug, the thing the screenshot actually
   showed.** GitHub's "Today"/"This week"/"Streak" numbers rendered
   as "IO"/"IOO" instead of "10"/"100" — traced (not guessed) to
   Cormorant Garamond's own digit glyph design at
   `text-3xl font-semibold`, not any CSS bug: `tabular-nums` only
   equalizes digit width, it can't substitute glyphs, and no
   `font-feature-settings`/ligature config exists anywhere in the
   codebase. Fixed by dropping the `font-heading` class from
   `Metric`'s value `<span>` (`packages/ui/src/metric.tsx`) so it
   inherits the page's default body font (Lora, already loaded, set
   as `body`'s `font-family` in `globals.css`) instead of opting into
   the heading face — no new font load needed.

**Left alone, confirmed legitimate in the audit**: Steam's
`aspect-[16/9]` cover-art image (an image aspect ratio, not a
card-layout bug), GitHub's heatmap month labels using `absolute`
positioning with JS-computed offsets (inherent to rendering a
calendar-heatmap grid), Hero's `max-w-2xl` quote line-length cap and
`mt-0.5` icon optical-alignment nudge (both correctly scoped, low risk,
left as-is rather than touched for the sake of touching them).

Verified via `pnpm lint`/`typecheck`/`test`/`build`/`test:e2e` (all
clean) and the same throwaway-preview-route technique as previous
rounds (uncommitted, deleted after — this time including Hero, to
verify the padding restructure, and deliberately forcing an
odd/uneven widget count to exercise the `dense` grid-flow fix),
screenshotted at desktop/tablet/mobile: no horizontal overflow at any
width, no grid holes (the Steam+Spotify pair and "coming soon"
placeholders backfill correctly instead of leaving gaps), Hero renders
full-bleed under the navbar exactly as before, GitHub's "This month"
block reads fine at its now-uncapped width, and "10"/"100"/"5d" render
as clean, unambiguous digits.

## 2026-08-02 — Dashboard layout regroup from design handoff, Spotify removed from grid, Notes gets a create-note modal

A high-fidelity handoff (`design_handoff_dashboard_layout/`) was supplied,
regrouping the dashboard grid. Implemented as specified, layout-only —
no new colors/type/radii/shadows.

1. **Single `auto-fit` grid replaced with two fixed-column grids.**
   `apps/web/src/app/page.tsx`'s `WidgetGrid` previously flowed every
   non-hero widget through one `grid-cols-[repeat(auto-fit,minmax(320px,1fr))]`
   grid with `[grid-auto-flow:dense]`, using a `PRIORITY_ORDER` array
   and an exclusion `Set` to force Tasks/Notes/Notebook first and pair
   Steam+Spotify into a sub-grid. Replaced with two explicit
   `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` grids: Row 1 (Tasks,
   Notes, Notebook — the 3rd item spans both columns only at the `sm`
   2-col breakpoint) and Row 2+3 (GitHub spanning 2 of 3 columns at
   `lg`, a new flex `side-col` div holding Steam+RSS that spans both
   grid rows at `lg` via `lg:row-span-2` with RSS stretching via
   `lg:flex-1`, then Habits/Reading). Below `lg` there's no 3rd column,
   so Row 2+3's four items just auto-flow in DOM order — no `dense`
   needed anymore, since nothing is being backfilled into earlier gaps.
2. **Spotify removed from the dashboard, not deregistered.** `page.tsx`
   no longer looks up or renders `spotifyWidget` — but
   `apps/web/src/lib/register-widgets.ts` still registers it, since
   `getAllWidgets()` also feeds the refresh cron
   (`apps/web/src/app/api/cron/route.ts`) and `actions/widgets.ts`;
   deregistering would have silently stopped Spotify's background
   cache refresh too. The handoff only asked to stop *rendering* it.
3. **New `compact` variant on `WidgetCard`/`cardShellClass`.**
   Tasks/Notes/Notebook's dashboard cards now show only a compact
   input + "View all →", with reduced chrome: 16px padding / 10px
   internal gap (vs. the default 20px/16px) and no divider above the
   footer. `cardShellClass` (`packages/ui/src/card-shell.ts`) gained a
   `gap` option (default `gap-4`, still used by `Skeleton`/`ErrorState`)
   so `WidgetCard`'s new `compact` prop could pass `gap-2.5` without a
   parallel copy-pasted class string.
4. **Tasks/Notebook cards drop their inline list/entries**, keeping
   only the compact input. The list/entry-rendering components
   (`TaskRow`, `NotebookEntryList`) stay in their packages — both are
   still used by `/tasks` and `/notebook`'s full pages.
5. **Notes reuses the existing `NoteModal`/`Modal` instead of a new
   component.** The dashboard card's always-inline title input +
   textarea + "New note" button + inline list was replaced with a
   single read-only `<input>` ("Write a note...") that opens
   `NoteModal` in create mode on focus — the same modal `/notes`
   already uses for creating and editing, which already had a "New
   note" title, Cancel/Save buttons, and Save wired to the real
   `addNote` server action. No new modal chrome was built. The
   card-local `AddNoteForm` and `NoteRow` components became fully
   unused once removed from `component.tsx` (not used by `/notes`,
   which uses `NotesPageBody`/`NoteListRow`/`NoteModal` instead) and
   were deleted rather than left as dead exports.
6. **Steam's game row became two full-width banners.** Previously a
   `w-12` thumbnail beside the game name; `CoverArt` already rendered a
   full-width 16:9 bordered tile, so this was a layout change only
   (name below instead of beside, two side by side via `flex flex-row
   gap-3` + `flex-col` per item) — no changes to `CoverArt` itself.

Verified via `pnpm lint`/`typecheck`/`test`/`test:e2e` (all clean).
`pnpm build` fails at the "Collecting page data" step on this
branch exactly as it does on `main` — `Error: supabaseUrl is
required.`, a pre-existing gap from this sandbox having no Supabase
credentials configured, not a regression (confirmed by stashing this
change and reproducing the identical failure on `main`). The live
authenticated dashboard was not screenshotted end-to-end: `/`'s
widget grid requires a signed-in session with real GitHub OAuth
credentials, which this environment doesn't have — `test:e2e` only
covers the signed-out homepage per its own config comment. The new
grid's Tailwind classes were instead cross-checked line by line
against the handoff's exact breakpoints/spans.

## 2026-08-02 — Follow-up from live feedback: desktop grid width-fill, iPad text-size false alarm

The merged layout was checked live in production (Safari,
iPad and desktop), reporting two things: iPad text looked smaller
than expected, and desktop cards didn't fill the page. This sandbox
can't reach that deployment (`AUTH_URL`/GitHub OAuth aren't configured
here — see prior entries), so verification used the established
throwaway-preview-route technique: a temporary route rendering every
real widget's `render()` with mock data (bypassing Supabase/GitHub/
Steam), screenshotted with real Playwright viewports, deleted before
commit.

**iPad text-size: investigated, not a code defect.** Measured
`getComputedStyle` font sizes at 1024px and 1180px (the range of
plausible iPad-landscape logical widths) against 1920px/2560px
desktop widths: `h1` is 48px, body text 16px, and card input text
14px — byte-identical across every one of those widths (all
`≥768px`, so `md:text-5xl` etc. are already active everywhere). The
Tailwind breakpoint math in `packages/widgets/hero/src/component.tsx`
and elsewhere matches the design spec exactly; nothing in this
codebase makes iPad render smaller text than desktop. Left uninvestigated
further since there's no code-level lead to chase — most likely
explanation is the iPad's physically smaller screen or a per-site
Safari zoom setting, not a layout bug.

**Desktop width-fill: confirmed and fixed.** `apps/web/src/app/page.tsx`'s
grid wrapper was capped at `max-w-6xl` (1152px) regardless of viewport
— at 1024–1180px (iPad) that's barely a cap at all, so the grid used
nearly full width ("fits properly," per report), but at 1920px+ (desktop)
it left ~650px+ of unused margin on wide monitors. This cap was a
deliberate, confirmed decision from the "Dashboard layout
architecture rebuild" entry above — not a regression from the layout
regroup — but seeing it live changed the call. Widened to
`max-w-[1600px]`: noticeably fills more of a 1920–2560px display while
still capping card/line width on ultra-wide monitors rather than
stretching content edge-to-edge (an uncapped grid would fight the
"calm, editorial" positioning in `docs/PROJECT_REFERENCE.md`'s §19).
Confirmed via the preview route that `1024px`/`1180px` widths are
unaffected (still below the new cap) and `1920px`/`2560px` widths now
measure a `1600px` grid instead of `1152px`.

Re-verified `pnpm lint`/`typecheck`/`test`/`test:e2e` after the change
(all clean) — `typecheck` needed a `rm -rf apps/web/.next` first, since
Next's dev-mode type validator had cached a reference to the deleted
preview route from a still-running `next dev` server.

## 2026-08-02 — Six bug-fix pass from live feedback round 2

Six more issues were reported after checking the live dashboard again.
Bug-fix only, each root-caused before fixing (via three parallel
read-only Explore agents), then verified interactively (not just
screenshotted) through the throwaway-preview-route technique.

1. **Notes dashboard-card modal never visibly closed after Save — a
   focus-return reopen loop, not a state bug.** `notes-card.tsx`'s
   trigger was a `readOnly` `<input onFocus={() => setOpen(true)}>`.
   `Modal`'s close effect (`packages/ui/src/modal.tsx`) always returns
   focus to whatever triggered it. Closing the modal refocused that
   same input, which re-fired `onFocus`, which reopened it — the modal
   closed and instantly reopened, every time. `/notes`'s `NotesPageBody`
   never had this bug because its trigger is a `<button onClick>`, and
   returning focus to a button after close is a no-op. Fixed by
   switching `notes-card.tsx`'s trigger to a `<button type="button"
   onClick>`, styled identically — same fix pattern `/notes` already
   proved out, not a new one. Verified with a real Playwright click +
   type + Enter + close-check, not just a screenshot, since this bug
   was inherently about a state transition a static screenshot can't
   show.
2. **Enter now saves instead of inserting a newline, Shift+Enter still
   makes one** — added `onKeyDown` to both
   `packages/widgets/notes/src/note-modal.tsx`'s body `<textarea>`
   (via a new `formRef` + `requestSubmit()`, reusing the existing save
   action — no new save path) and
   `packages/widgets/notebook/src/notebook-input.tsx`'s `<textarea>`
   (clears the pending autosave debounce timer and calls the existing
   `attemptSave(content)` immediately). Notebook has no save/add button
   at all (pure autosave) — that was found confusing without an
   explicit trigger, so Enter is now that trigger, without changing the
   underlying autosave behavior for anyone who just keeps typing.
3. **Notebook entries show a subtle added/edited timestamp on the
   left.** Previously `notebook-entry.tsx` only showed a day-granularity
   relative label ("Yesterday") above the content, and `updatedAt` was
   read nowhere. Added `formatEntryTimestamp` to `format.ts` (one line:
   the edited time + "(edited)" if `updatedAt` differs from
   `createdAt`, otherwise just the added time — chosen over a
   two-line always-both-times layout, to keep it "not obvious").
   Restructured the entry from `flex-col` to `flex-row` with a narrow
   muted-text left column. Applies to both the dashboard card and
   `/notebook` automatically — `NotebookEntryList`/`NotebookEntry` are
   already the single shared rendering path (confirmed: the dashboard
   card itself doesn't render the entry list at all anymore, per this
   file's Dashboard-layout-regroup entry above — this fix's visible
   surface is `/notebook`).
4. **RSS card now fills down to the Habits/Reading row's bottom edge.**
   Root cause: `apps/web/src/app/page.tsx`'s `ROW_GRID` sets
   `items-start` on the grid container (needed so GitHub/Habits/Reading
   each size to their own content, not stretch to match a neighbor) —
   but that same `items-start` also stopped the `lg:row-span-2`
   side-column div from stretching to its full two-row span in the
   first place, so it was only ever as tall as Steam+RSS's own content,
   leaving RSS's `lg:flex-1` nothing to grow into. Fixed with two
   additions, both `lg`-scoped only: `lg:self-stretch` on the
   side-column div (makes *it* fill its spanned rows), and
   `lg:[&>*]:h-full` on the RSS wrapper (makes `WidgetCard`'s root
   actually consume that height — `WidgetCard`'s body div already has
   `flex-1` internally, it just never had a real parent height to grow
   into before). No change to `card-shell.ts`'s deliberate no-`h-full`
   stance — this stretch is scoped to one specific grid item via
   `self-stretch`+a child selector, not a global default.
5. **Pull-to-refresh indicator is now an animated `RefreshCw` icon,
   not text.** Investigated the "doesn't work on iPad" report first:
   `use-pull-to-refresh.ts` has no width/viewport gating anywhere —
   it's purely `TouchEvent`-driven, so the gesture itself should
   already fire on any touch-capable device including iPad Safari.
   Nothing here to "enable" for tablets. What's fixed:
   `refresh-all-title.tsx` rendered literal text ("Pull to refresh" /
   "Release to refresh") that also disappeared immediately on release
   (`pullDistance` resets to 0 in the hook before `isPending` even
   flips true), so a refresh-in-progress was never actually shown.
   Replaced the text with `RefreshCw` (already `WidgetMenu`'s Refresh
   icon and `ActionForm`'s icon-variant spinner — reused for
   consistency, not a new icon), rotating proportionally to
   `pullDistance` while dragging and continuously spinning
   (`animate-spin`, the same pattern `action-form.tsx` already uses)
   while pending — and widened the display condition to
   `pullDistance > 0 || isPending` so the spinning icon now stays
   visible through the actual refresh, which the old text never did
   either.
6. **Profile dropdown: removed Tasks and Notes.** Both already have a
   "View all →" link on their own dashboard card, so the dropdown copy
   was redundant navigation — 2-line removal from `NAV_LINKS` in
   `profile-menu.tsx`, plus its stale doc comment.

Verified `pnpm lint`/`typecheck`/`test`/`test:e2e` (all clean) and,
via the throwaway-preview-route technique, both screenshots (mobile/
iPad/desktop) and real Playwright interaction (click the Notes
trigger, type, Shift+Enter vs. Enter, confirm the modal actually
disappears; type into the Notebook box and confirm Enter doesn't leave
a newline; confirm the RSS card's rendered height now matches
Habits/Reading's row bottom). Pull-to-refresh's gesture itself
couldn't be interaction-tested (touch-only, and Playwright's default
driver is mouse-based) — its existing test suite
(`use-pull-to-refresh.test.tsx`) stayed green, and the icon swap was
confirmed by reading the render logic, not by simulating a touch drag.

**Correction, same day:** item 3's "(edited)" tag was removed almost
immediately after it was pointed out there's no entry-edit UI at all —
the only way `updatedAt` ever differs from `createdAt` is the
autosave upsert re-saving the same still-open draft while the user
keeps typing, which isn't something a person perceives as "editing" a
past entry. `formatEntryTimestamp` now takes just `createdAt` and
always shows the added time; `format.test.ts`'s edited-tag test case
was removed accordingly. Recorded here rather than editing the entry
above, so the reasoning that led to (and then reversed) the "(edited)"
tag stays visible.

## 2026-08-02 — GitHub PRs/merges tracked as Timeline memory events

A question came up whether the Timeline could track GitHub activity beyond
the one signal it already had ("Created a new repository") —
specifically every PR opened and every merge, across all repos
(not just Pulse; Pulse just happens to be one of them, so it's covered
without a repo-specific filter). Pulse already had the plumbing for
this (`docs/MEMORY_ROADMAP.md` M1: `Widget.deriveMemories` +
`packages/database/src/memories.ts` + the Timeline page) — GitHub's
widget just hadn't used it for anything beyond a repo-count diff.

**The real risk, discussed before writing any code:** getting
individual PR titles/repos (not just a count) needs GitHub's GraphQL
`pullRequestContributions` connection, genuinely new territory — no
query in this codebase has ever used it. A prior decision (this file,
2026-07-22) deliberately kept the GitHub widget to contribution-*count*
data specifically to avoid needing broader OAuth scope than the
`read:user` already granted at login, and this risked reopening that
tradeoff. This sandbox has no live GitHub token to verify scope
requirements ahead of time. **The explicit call: if it turns out to
need broader scope/re-authorization, don't pursue it — ship it only if
it works under the existing grant, no re-auth flow to be built either
way.** (The Pulse repo itself is public, which removes one variant of
this risk for that repo specifically, but the general "any repo"
scope question for GitHub's PR-data connection is still unverified
from here.)

**What shipped, built so a scope failure degrades gracefully instead
of breaking anything:**
1. `packages/adapters/github/src/contributions.ts` gained
   `fetchRecentPullRequests` — a third GraphQL query alongside
   `fetchContributions`/`fetchActivitySummary`, over a **trailing
   90-day window** rather than calendar-month-to-date like
   `fetchActivitySummary`: a PR's "contribution" date is when it was
   *opened*, so a month-to-date window would silently miss a merge
   event for a PR opened in a prior month. Same query/error-handling
   style as the two existing functions.
2. `packages/widgets/github/src/types.ts`: added
   `recentPullRequests: z.array(pullRequestSchema).optional().default([])`
   to `githubDataSchema` — defaulted so cache rows written before this
   shipped still parse in `readWidgetCache` (which throws on a schema
   mismatch, not silently degrades) instead of breaking every existing
   user's GitHub widget on the first read after deploy.
3. `packages/widgets/github/src/fetch.ts`: the new fetch runs in the
   same `Promise.all` as the other two calls but wrapped in its own
   `.catch(() => [])` — today, any one of these three calls throwing
   fails `fetchGitHubData` entirely (stale heatmap/counts, no memories
   at all, for that user, every 30-min cron tick). Isolating just this
   call means a permission/scope error here can only ever mean "no PR
   memories this cycle," never a broken widget. This is the actual
   mechanism behind "ship it only if it works" — no separate rollout
   flag or config needed.
4. `packages/widgets/github/src/derive-memories.ts`: extended
   `deriveGitHubMemories` with the same list-diff idiom Tasks/Notes/
   Notebook already use (a `Map`/`Set` of previous item ids, diffed
   against the next snapshot) plus Steam's "detect a meaningful state
   change" variant — a PR id absent from the previous snapshot is
   "Opened PR #n: title"; a PR present in both snapshots whose `merged`
   flipped false→true is "Merged PR #n: title". A PR already merged
   the first time it's ever seen only gets the one "Opened" event, not
   both.
5. **Type-system wrinkle**: `Widget.dataSchema` is typed `ZodType<TData>`,
   which requires a schema's input type to equal its output type —
   but `.optional().default([])` intentionally makes the input
   optional where the (always-defaulted) output isn't, so
   `githubDataSchema` no longer satisfied that constraint structurally.
   Fixed with a single documented cast at the one assignment site
   (`packages/widgets/github/src/widget.ts`:
   `githubDataSchema as ZodType<GitHubData>`) — a real zod input/output
   variance limitation, not a logic error being suppressed; the
   default-value behavior itself is exercised directly by
   `types.test.ts`.
6. No Timeline UI changes — `apps/web/src/app/timeline/page.tsx`
   already renders any memory's `title`/`description` with no
   per-source special-casing.

**Expected one-time effect, not a bug:** the first refresh after this
ships, every cached user's `previous.recentPullRequests` will be
missing, so every PR currently in the trailing 90-day window looks
"new" and backfills into the Timeline at once — the same cold-start
behavior Tasks/Notes/Notebook's own list diffs already have whenever
they're introduced or a user's cache is empty.

Verified `pnpm lint`/`typecheck`/`test`/`test:e2e` (all clean; new
adapter tests for `fetchRecentPullRequests`'s parsing/window/error
handling, new `derive-memories.test.ts` cases for opened/merged/
unchanged/cold-start, new `types.test.ts` cases for the schema
default). **Not verified**: an actual live GraphQL call — this sandbox
has no real GitHub token, so whether `pullRequestContributions`
actually returns data under `read:user` alone can only be confirmed
once deployed. If it doesn't, the isolation in `fetch.ts` means
`recentPullRequests` just stays permanently empty and no PR memories
ever appear — a silent no-op, not a broken widget, per explicit
instruction not to pursue a scope upgrade if this turns out to need
one.

## 2026-08-03 — Pre-publication audit fixes: license, CI permissions, RLS, personal-info scrub

Ahead of making the repo public, a full security/hygiene audit found no
leaked secrets (checked against the entire git history) and no
critical/blocking issues, but several warning-level gaps worth closing
before going public:

- **`LICENSE` added** (MIT) — previously completely absent, which would
  have legally blocked any reuse/forking once public.
- **GitHub Actions token permissions restricted** — neither workflow
  declared a `permissions:` block, so both ran with default (unscoped)
  token permissions. `refresh-widgets.yml` now declares `permissions:
  {}` (it only issues an outbound `curl`, needs zero GitHub API access);
  `test.yml` declares `permissions: contents: read`.
- **Supabase RLS enabled** — `0006_enable_rls.sql` turns on Row-Level
  Security with default-deny (no policies) on every `public` schema
  table. Not exploitable before this — all access went exclusively
  through the server-only service-role client, which bypasses RLS by
  design, and `anon` had zero grants — but `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  plumbing already existed unused end-to-end (env, `turbo.json`, CI).
  This closes the gap before any browser-side client is ever
  introduced.
- **Personal information scrubbed from docs and test fixtures** — the
  maintainer's real first name (~171 mentions across this file and
  related docs), the real GitHub handle baked into GitHub adapter/widget
  test fixtures, and a live production URL were reworded to
  passive/impersonal voice or redacted. A privacy/tone call, not a
  security fix — none of this was ever an access-control issue.
- **`docs/redesign-reference/` removed** — a stale raw AI design-tool
  export: referenced the already-deleted `quick-launch` widget, loaded
  third-party CDN scripts (unpkg React/Babel, Unsplash), embedded the
  real repo slug. Nothing in code or docs depended on it besides
  `CLAUDE.md`'s own pointer, updated to treat `docs/DESIGN_SYSTEM.md` as
  the sole design source of truth.
- **Dependency/config alignment**: `apps/web`'s `@types/node` was `^20`
  against root's `^22`/`engines.node: ">=22"` — aligned. `trustHost:
  true` set explicitly in the Auth.js config rather than relying on
  framework inference (Pulse deploys on Vercel). `next-auth` bumped
  `5.0.0-beta.31` → `beta.32`, the latest available — no stable v5
  exists upstream yet, so this remains a known, accepted risk rather
  than something fully resolvable right now.

`README.md` was explicitly left untouched — flagged by the audit as
missing setup/install instructions, but reserved as the maintainer's own
edit, not touched by this pass.

## 2026-08-03 — Supabase CLI linked; migrations no longer applied by hand

The 2026-07-31 "manual-migration gotcha" entry above documented that this
repo had no automated migration pipeline — no `supabase/config.toml`
linking a project, every migration pasted by hand into the Dashboard's
SQL Editor in filename order. That's now superseded: `supabase` (the
CLI) is added as a root devDependency, and the project is linked locally
via `pnpm exec supabase link --project-ref <ref>` (run once, per
developer — the resulting `supabase/config.toml` is safe to commit, it's
just the project ref, no secrets).

Going forward, apply migrations with `pnpm exec supabase db push`
instead of copy-pasting into the SQL Editor. `.gitignore` gained
`/supabase/.branches` and `/supabase/.temp` for the CLI's local link
state. The manual SQL Editor path still works as a fallback (nothing
about the migration files themselves changed), but the CLI is now the
intended path — it removes the exact "committed but never run" gap the
2026-07-31 entry hit.

## 2026-08-03 — CI workflow renamed test.yml → ci.yml, push trigger dropped

Requested as a fresh `ci.yml` (install → lint → typecheck → test → build
on every PR). `.github/workflows/test.yml` already did exactly that (plus
Playwright e2e), so a new file alongside it would have run the same
checks twice on every PR for no benefit — renamed/repurposed the existing
workflow instead of duplicating it.

Two real changes beyond the rename:
- **Trigger narrowed to `pull_request: branches: [main]`, dropping
  `push: branches: [main]`.** Every change reaches `main` through a PR,
  so the post-merge push re-ran a check that had already passed against
  the same commit — pure redundancy.
- **`actions/setup-node` now reads `node-version-file: package.json`**
  (parses the `engines.node` field) instead of the hardcoded `node-version:
  22` it had before, so the workflow can't silently drift from the
  version the repo itself declares as its requirement.

`refresh-widgets.yml` is untouched — it's an unrelated cron job, not part
of this consolidation.

## 2026-08-03 — Dependency vulnerability sweep: 16 advisories fixed

`pnpm audit --prod` found 16 vulnerabilities (1 critical, 8 high, 7
moderate) across three dependency chains, none of them ever exploited —
this is a proactive fix ahead of publishing the repo, not a response to
an incident.

- **`next` 16.2.10 → 16.2.12** — the patched release. Fixes four high
  advisories (Turbopack middleware/proxy bypass, Server Actions DoS,
  SSRF in Server Actions on custom servers, SSRF in rewrites via
  attacker-controlled destination hostname) and four moderate ones
  (cache confusion for requests with bodies, unbounded Server Action
  payload in Edge runtime, image-optimization DoS via SVG, disclosure of
  internal Server Function endpoints).
- **`@auth/supabase-adapter` `^1.11.2` → `^1.11.3`** — pulls in
  `@auth/core@0.41.3` instead of `0.41.2`, fixing the one **critical**
  advisory (email normalizer validated the address before Unicode
  normalization, allowing a homoglyph `@` bypass) plus a high one
  (`getToken()` threw an uncaught exception on malformed Bearer headers)
  and a moderate one (OAuth state/nonce/PKCE cookies weren't bound to
  the provider that created them).
- **`postcss` and `sharp` — forced via `pnpm-workspace.yaml`'s new
  `overrides` block**, not a direct dependency bump. Both are pulled in
  by `next` itself (postcss for its CSS build pipeline, sharp for
  `next/image`), and `next@16.2.12` still pins `postcss@8.4.31` and
  `sharp@^0.34.5` internally — bumping `next` alone doesn't fix them.
  Overrides force `postcss >=8.5.18` (fixes a high-severity arbitrary
  `.map` file disclosure via `sourceMappingURL` path traversal, an
  earlier high-severity file-read variant, and a moderate XSS via
  unescaped `</style>` in stringified output) and `sharp >=0.35.0`
  (fixes several inherited libvips CVEs).

Re-ran `pnpm audit --prod` after: zero vulnerabilities. Confirmed
`pnpm lint`/`typecheck`/`test` and a full `pnpm build` (CI-equivalent
placeholder env vars, same pattern as `ci.yml`) all still pass — this
was a same-major/patch-level bump for `next`, a patch bump for the auth
adapter, and forced-but-compatible transitive bumps for `postcss`/
`sharp`, so no app code changes were needed.

## 2026-08-03 — Post-merge security/bug review: four real fixes, two flagged

A full pass (two parallel read-only reviews — one security-focused, one
correctness-focused — plus manual verification of every finding before
acting) turned up four fixable issues and two worth flagging without a
blind fix. `pnpm audit` findings are recorded separately.

**Fixed:**

1. **`/api/cron` bearer-token comparison switched to `crypto.timingSafeEqual`**
   (`apps/web/src/app/api/cron/route.ts`). Was a plain `!==` string
   comparison — a theoretical timing side-channel on `CRON_SECRET`. Low
   real-world risk (no rate limiting exists to support the huge number of
   timed requests such an attack would need — see the flagged item
   below), but cheap to close properly.
2. **GitHub PR-fetch failure no longer manufactures duplicate Timeline
   events** (`packages/widgets/github/src/fetch.ts`). A transient
   `pullRequestContributions` GraphQL failure was caught and degraded to
   `[]`, which got cached as truth — the *next* successful refresh then
   diffed the real open PRs against that empty snapshot and re-emitted
   "Opened PR" events for PRs that had already been recorded days/weeks
   earlier. Now falls back to the last known-good `recentPullRequests`
   from the widget's own cache on failure, so a transient error freezes
   state instead of wiping it.
3. **GitHub "today"/streak calculation now uses a fixed reference
   timezone instead of UTC** (`packages/adapters/github/src/contributions.ts`,
   `packages/widgets/github/src/streaks.ts`). `contributions.ts` already
   had a comment explicitly warning that GitHub buckets contribution days
   by profile timezone, not UTC — but the code right below it computed
   "today" via `now.toISOString()` anyway. For a positive UTC offset
   (matching `@pulse/widget-hero`'s `HERO_TIME_ZONE = "Asia/Kuching"`,
   UTC+8), this meant "Today"/streak-extension silently used yesterday's
   data for the first ~8 hours of every local day. Both files now compute
   "today" via `Intl.DateTimeFormat` pinned to `Asia/Kuching` (duplicated
   as a literal in each file rather than imported across the
   adapter/widget boundary — see each file's own comment).
4. **`repositoriesCreated` month-boundary false-negative fixed**
   (`packages/widgets/github/src/derive-memories.ts`). It's a
   month-to-date counter; comparing it directly across a month boundary
   (e.g. 4 repos created in July vs. 1 so far in August) meant a real new
   repo could go unreported on the first refresh of a new month, since
   `1 > 4` is false. Now treats `activitySummary.periodStart` changing as
   the counter having reset to 0, not compared against last month's
   stale total.

**Flagged, not fixed:**

- **`upsertProviderAccount`'s upsert conflict target is `(provider,
  providerAccountId)`, not `(userId, provider)`**
  (`packages/database/src/accounts.ts`). If the same external OAuth
  account (e.g. the same real Spotify account) is ever connected under
  two different Pulse `userId`s, the upsert silently re-homes that row's
  `userId` to whichever user connects it most recently — the first
  user's Spotify widget would then read as disconnected. This is
  standard Auth.js/NextAuth schema behavior, not a Pulse-specific bug:
  `next_auth.accounts`' only unique constraint is `provider_unique
  unique (provider, "providerAccountId")` (`0000_next_auth_schema.sql`),
  shared with Auth.js's own adapter writes for the GitHub login provider
  — there's no `(userId, provider)` constraint to upsert against without
  a schema migration that also touches Auth.js's account-linking
  behavior. Given this is a single-user-per-deployment personal app
  (see `widgets.ts`'s own "single-user app" framing), the realistic
  exposure is narrow (requires a second person sharing the same deployed
  instance and the same real Spotify account) — left as a known,
  documented limitation rather than a rushed schema change.
- **No rate limiting anywhere** — `/api/cron`, `/api/connect/spotify`,
  and authenticated server actions (create note/task, refresh-all) have
  no throttling. Bounded in practice by `CRON_SECRET` secrecy and
  per-user `user_id` scoping (an abusive authenticated session can only
  burn its own write/upstream-API budget, not another user's), but worth
  addressing with real rate limiting (e.g. Upstash/Vercel Edge Config) if
  this ever moves beyond single-user-per-deployment.

Every `packages/database/src/*.ts` read/write function was independently
re-verified to filter by `user_id`/`userId` — this is the actual
authorization boundary today, since RLS is enabled with no policies (see
the earlier RLS entry) and everything goes through the service-role
client. No missing `user_id` filter was found on any per-user query.

## 2026-08-03 — Live URL leak in public Actions logs; PULSE_URL moved to a secret

Once the repo went public, `refresh-widgets.yml`'s `PULSE_URL` — passed
as a GitHub Actions *variable*, not a *secret* — turned out to be
plaintext-visible in every one of that workflow's run logs (variables
aren't masked the way secrets are; `CRON_SECRET` in the same log showed
as `***`, `PULSE_URL` showed its real value). Since the workflow runs
every 30 minutes, this was live in dozens of public logs by the time it
was caught.

**Compounding bug found in the same log line**: the value was the *old*,
pre-2026-07-24-rename Vercel domain, and the logged response body was
`"Redirecting..."` — the 307 Vercel keeps as a courtesy on the old alias
(see the domain-rename entry above). `curl --fail` only fails on
4xx/5xx, and the command had no `-L`, so every run was "succeeding" on
the redirect response itself without ever reaching `/api/cron`. Cron
refreshes have likely been silently broken since the rename.

**Fixes**:
- `PULSE_URL` moved from a repo Variable to a repo Secret
  (`${{ secrets.PULSE_URL }}` instead of `${{ vars.PULSE_URL }}`) —
  masked in logs going forward.
- Added `-L` to the curl call so a redirect (stale URL, domain migration
  mid-flight, etc.) is actually followed instead of silently
  "succeeding" against the redirect page.
- The Vercel project's old domain aliases were removed and a fresh one
  issued (external, not reachable from this environment) — this is what
  actually neutralizes every already-leaked copy of the old URL
  (git history, deleted-but-possibly-cached Action logs, this doc's own
  earlier prose), since the old hostname now resolves nowhere.
- The remaining `[redacted-old-domain]` literal mentions in
  `docs/ROADMAP.md` and this file's domain-rename entry were genericized.
- The ~30 existing Action run logs that showed the old `PULSE_URL` in
  plaintext were deleted via the GitHub API.
- Git history was rewritten to scrub the old domain string from past
  commits too (see the follow-up entry below) — a heavier step than the
  domain rotation strictly requires, since a rotated/removed domain is
  already a dead URL wherever it's found, but done at explicit request
  for full removal.

## 2026-08-05 — Sign-in restricted to a single owner GitHub account

Pulse's GitHub OAuth had no allowlist: any GitHub account could sign in
and get an account row created (though scoped `userId` reads mean they'd
only ever see their own empty dashboard, never Ken's data). For a
single-user personal app this was unnecessary open sign-up — every
extra account is wasted Supabase/cron/API quota and surface area for no
benefit, since Pulse isn't meant to support other users yet.

Added a `signIn` callback in `packages/auth/src/config.ts` that rejects
any GitHub profile whose `login` doesn't match the `OWNER_GITHUB_USERNAME`
env var, before Auth.js creates an account. New env var registered in
`turbo.json`'s `build.env` and `.env.example` per this repo's own
env-var rule.

Chose a single hardcoded username over a multi-user allowlist since only
Ken uses Pulse today — revisit if/when Pulse ever needs to support a
second real user.

## 2026-08-06 — Hero quote picking switched from random to sequential rotation

`pickQuote` picked a random quote from `QUOTES`, excluding only the last 5
shown. With a 30-quote list that's a small exclusion window relative to
`Math.random()`'s natural clustering — in practice this read as "the same
few quotes keep coming back," not as genuinely random, since nothing
guaranteed even coverage of the list.

Replaced the random pick with sequential rotation in list order (coffee →
dev-humor → dark-humor → humor, per `quotes.ts`'s own grouping), wrapping
back to the start after the last quote. `recentQuotes` (still `string[]`
in `HeroData`'s schema for storage-shape stability) now holds just the
single last-shown quote's text, used only to find where in `QUOTES` to
resume from — not an anti-repeat exclusion list anymore.

This only changes when a new quote is *picked* — the quote still only
advances on a cron refresh, a manual "Refresh all," or clicking the quote
itself (`cycleQuote`), same as before. A plain browser reload still shows
the same cached quote; that's an existing, separate behavior (widgets
never fetch at render time — see `docs/ARCHITECTURE.md`), not something
this change touches.

## 2026-08-06 — Security headers added; postcss/sharp dependency bumps

A deliberate audit pass (prompted by three prior reactive security fixes —
the live-URL log leak, the git history rewrite, and open GitHub OAuth
sign-up) found two real gaps that hadn't been caught by anything else in
the pipeline:

- **No security headers at all.** `next.config.ts` was empty and there
  was no `vercel.json` — no `X-Frame-Options`, no CSP, no
  `Referrer-Policy`, no `Permissions-Policy`. Added all four via
  `next.config.ts`'s `headers()`. The CSP's `script-src`/`style-src` keep
  `'unsafe-inline'` rather than a nonce setup — Next's App Router injects
  inline hydration/RSC payload scripts, and this repo uses plenty of
  inline `style=""` attributes (heatmap.tsx's `cqw` calc,
  refresh-all-title.tsx's mask-image), and nonce-based CSP needs
  per-request middleware this app doesn't have yet. The other directives
  (`connect-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`,
  `object-src 'none'`) still meaningfully narrow the attack surface —
  particularly `connect-src`, which blocks exfiltrating this single-user
  app's personal data to an attacker's origin even without a strict
  `script-src`. Verified with a headless-browser check against a real
  `next start` server (Playwright, `securitypolicyviolation` listener):
  zero CSP violations, zero console errors, sign-in page renders and
  hydrates normally.
- **Two dependency vulnerabilities** (`pnpm audit`): `postcss@8.5.20`
  (moderate, GHSA-fxqj-rqcc-2cmp, incomplete-fix sourceMappingURL
  handling — dev-only via `vite`/`@tailwindcss/postcss`) and
  `sharp@0.34.5` (high, libvips CVEs, pulled in as one of two resolved
  versions via Next's optional image-optimization dependency). Both
  pinned to patched versions via root `package.json`'s `pnpm.overrides`.
  `pnpm audit --prod` is clean after the bump.

## 2026-08-06 — Service worker was breaking third-party images (GitHub avatar, Steam cover art)

Found while verifying the security-headers PR above: the profile avatar and
Steam cover art weren't loading in production. DevTools console showed *"A
ServiceWorker passed a promise to FetchEvent.respondWith() that resolved
with non-Response value 'undefined'"* for both — not a CSP issue (verified
clean response headers on both CDNs, no CSP violations fired).

Root cause was in `apps/web/public/sw.js`'s `fetch` handler, unrelated to
anything in the CSP PR: it intercepted *every* GET request, including
cross-origin ones (GitHub avatar CDN, Steam CDN), applying the same
cache-then-network-with-offline-fallback logic meant for the app shell.
When the underlying `fetch()` to a third-party CDN rejected — cross-origin
requests inside a service worker are more prone to this than same-origin
ones — the code fell back to `cached`, which was `undefined` for a URL
that had never been cached. Passing `undefined` to `respondWith()` is
invalid and the browser kills the request outright.

Fixed by having the fetch handler bail out immediately for any
cross-origin request (`if (new URL(event.request.url).origin !==
self.location.origin) return;`), letting the browser handle third-party
resources natively — the SW was never meant to proxy those, only the app
shell (`SHELL_URLS`). Also hardened the `.catch(() => cached)` fallback to
`.catch(() => cached ?? Response.error())` as defense-in-depth for the
same class of bug on a same-origin cache-miss. Bumped `CACHE_NAME` to
`v2` so the new worker takes over cleanly on next load.

Verified the fix's mechanism directly: simulated a rejected cross-origin
fetch (Playwright route interception + `route.abort()`) against a
minimal reproduction of the old vs. new `sw.js` — old crashed with the
exact `respondWith(undefined)` error, new failed the request cleanly
with a normal `net::ERR_FAILED` (letting the app's existing
onError/fallback UI handle it, e.g. Steam's "No cover art" state) with
no service-worker crash.

## 2026-08-07 — RSS: real widget, replacing the "Coming soon" placeholder

Built as a real `Widget` for the first time, following the Steam widget's
exact shape (`packages/adapters/rss` owns the HTTP/parsing, `packages/
widgets/rss` owns the card, `fetch.ts` wires them together).

- **Fixed source list, no settings UI** — same reasoning as Hero's
  fixed quote list: no per-user configuration exists yet, and building a
  settings form for a single curated list would be scaffolding ahead of
  need. `RSS_SOURCES` in `constants.ts` is the one place to add/remove
  feeds. Sources are the four named in the 2026-07-26 placeholder entry:
  GitHub Blog, OpenAI, Apple, Steam.
- **RSS/Atom normalized to one shape** in the adapter (`fetchFeed`) —
  feeds disagree on field names (`pubDate` vs `updated`/`published`,
  `link` as a text node vs an Atom `<link href>` attribute), so every
  caller deals with one `NormalizedFeedItem` shape instead of
  re-deriving this per feed. `parseTagValue: false` on the XML parser
  avoids a real footgun: a post literally titled e.g. "2026" would
  otherwise get silently type-coerced to a number.
- **Per-feed error isolation**, same pattern as Steam's fetch.ts: each
  source is fetched and caught individually, so one dead/slow feed only
  means fewer items, never an empty widget or a failed refresh for
  every other source.
- **No `deriveMemories` for v1** — kept deliberately minimal per the
  "as long as it's reasonable, it's v1" scope given for this pass;
  worth reconsidering once real usage shows whether "new post from X"
  belongs on the Timeline.
- **Feed URLs for OpenAI and Steam are best-effort, unverified.** This
  environment's sandboxed network policy blocks all four source domains
  outright (proxy-level 403, confirmed via `/__agentproxy/status`), so
  none of the four could be fetched to confirm from here — not even the
  ones later confirmed reliable. GitHub Blog (`github.blog/feed/`) and
  Apple Newsroom (`apple.com/newsroom/rss-feed.rss`) are long-stable
  official feeds I'm confident in; OpenAI's and Steam's URLs in
  `constants.ts` are reasonable guesses that need a live check once
  deployed — per-feed error isolation means a wrong URL degrades
  quietly (fewer items, a logged server error) rather than breaking
  anything, but they should still be corrected if wrong.
- Wired into `WidgetGrid` in place of the static placeholder, same
  position (Steam+RSS side column, stretching to fill remaining height
  below Steam) — no layout change, only the card's content became real.

## 2026-08-07 — RSS: fixed title overflow; still missing Apple/Steam items

Live check after merge (per the previous entry's caveat) found two
issues:

- **Long titles overflowed the card instead of truncating** — confirmed
  with a real browser measurement (a title rendered 682px wide inside a
  318px card). Root cause: `component.tsx`'s `<a>` wrapper is a
  column-direction flex container with `items-start`, which sizes
  children to their own content width (shrink-to-fit) rather than
  stretching them to the container's width — so the `truncate` span had
  nothing constraining its max-width for `overflow: hidden` to clip
  against. Fixed by adding `w-full` to both spans; re-measured after the
  fix (`scrollWidth 682 > clientWidth 300` — genuinely clipped, not just
  visually similar).
- **Apple and Steam produced zero items** — exactly the risk flagged
  when this shipped (their feed URLs were unverified guesses). Added a
  browser-like `User-Agent` header to the adapter's fetch — some feed
  hosts (Apple plausibly among them) reject requests with no UA or an
  obviously non-browser one — but this environment still can't reach
  either domain to confirm it's the actual fix or the whole story. Real
  URLs may need correcting in `RSS_SOURCES` once checked against a live
  environment with normal internet access.

## 2026-08-07 — RSS: replaced the guessed "Steam" source with real per-game feeds

Live check confirmed the User-Agent header didn't fix Steam (Apple still
unconfirmed either way). There's no single official "Steam blog" feed —
the original `feeds/news.xml` guess was a plain 404. Swapped it for
Steam's real, documented per-app news feed format
(`store.steampowered.com/feeds/news/app/<appid>/`), pointed at the two
games actually tracked by the Steam widget's configured SteamID
(Palworld `1623730`, Forza Horizon 6 `2483190` — same appIds
`cover-art.tsx` already uses), by request. `RSS_SOURCES` is now 5
entries instead of 4; `MAX_ITEMS` (6) is unchanged.

## 2026-08-08 — RSS: fixed the real Steam parse failure (entity-expansion cap)

Vercel's runtime logs (requested directly, since this sandbox can't reach
any of the source domains) showed the actual error for both Steam
sources: `Entity expansion limit exceeded: 3257 > 1000` /
`1019 > 1000` — not a network/URL problem at all. Steam's per-app news
feed embeds full HTML-escaped patch notes in its `description` field
(`&lt;p&gt;...&lt;/p&gt;` etc.), which this adapter never reads (only
`title`/`link`/`pubDate`) but `fast-xml-parser` still fully decodes by
default — and its anti-XML-bomb safeguard caps total entity expansions
per document at 1000, tripping on a single long patch-notes post.

Traced the exact mechanism in `fast-xml-parser`'s source
(`OrderedObjParser.js`): `&lt;`/`&gt;`/`&quot;`/`&apos;` count toward the
cap, but `&amp;` is specially exempted (handled last, uncounted) — so an
initial synthetic test using only `&amp;` passed even with the bug still
present, a false-negative regression test. Rewrote it using escaped
`&lt;p&gt;...&lt;/p&gt;` repetitions instead, confirmed it actually fails
without the fix (`1200 > 1000`, same error class as production) and
passes with it.

Fixed via `stopNodes: ["*.description", "*.summary", "*.content",
"*.content:encoded"]` on the parser — these are exactly the
bulky-content fields this adapter never consumes, so telling the parser
to keep them as raw, un-decoded text sidesteps the cap entirely for
fields we don't need anyway.

## 2026-08-08 — RSS: source priority tiers, replacing pure chronological merge

By request, once Steam's per-game feeds were confirmed working: game
news (Palworld, Forza Horizon 6) should always show before Apple news,
which should always show before GitHub Blog — not just whichever source
happened to post most recently. Dropped OpenAI as a source entirely (no
longer wanted).

Added a `priority` number to each `RssSource` in `constants.ts` (lower
sorts first); `fetch.ts`'s merge now sorts by `(priority, then
publishedAt desc)` instead of a single global chronological sort across
all sources — items are grouped into tiers first, recency only breaks
ties within a tier.

Apple's own newsroom feed was never confirmed reachable (flagged as an
open question in the 2026-08-07 entries) — replaced with two
established, high-confidence Apple-focused blog feeds (9to5Mac,
MacRumors) instead of continuing to guess at Apple's own URL.

## 2026-08-08 — RSS: capped per-tier so game news can't crowd out everything

Live check after the priority-tier change above surfaced the obvious
consequence: Palworld/Forza Horizon 6 alone had 6+ recent posts, so the
`MAX_ITEMS` cap was entirely full of game news — Apple and GitHub never
got a slot at all, even though they were "next" in priority.

Added `mix.ts`'s `mixByPriority` — an even soft cap per tier
(`maxItems / tier count`, rounded up; 2 each for 3 tiers at
`MAX_ITEMS = 6`) applied first, with any tier's unused capacity handed
to higher-priority tiers before lower ones. Output stays grouped by
tier (game news block, then Apple block, then GitHub block) — this only
decides how many slots each tier gets, not interleaving order. Pure
function, unit tested directly (5 cases: even split, backfill priority,
crowding prevention, short-content fallback, edge cases) rather than
only exercised indirectly through `fetch.ts`.

## 2026-08-08 — Steam cover art: ask Steam's own API instead of guessing the CDN path

Forza Horizon 6 kept showing "No cover art" even after the service
worker fix (2026-08-06) resolved the actual loading bug — confirmed
across several live checks. Root cause: `CoverArt` only ever guessed at
two CDN path conventions (`header.jpg`, `capsule_616x353.jpg`), and
neither exists for every app — Steam's newer asset pipeline doesn't
always follow those exact paths, so a game with real cover art at a
different path was silently shown as if it had none.

Added `fetchAppCoverArtUrl` to `@pulse/adapter-steam` — calls Steam's
public store metadata endpoint (`store.steampowered.com/api/appdetails`,
no API key needed, same data the store page itself reads) for the
game's real, currently-valid `header_image`/`capsule_image` URL,
instead of constructing a guess. Returns `null` (not a thrown error) on
any failure — cover art is decorative, not worth failing the widget
refresh over, same reasoning as achievements.

`CoverArt` now tries the real URL first, falling back to the two
guessed conventions only if that fails or wasn't available (cache rows
written before `coverArtUrl` existed, or Steam's appdetails call
itself failed) — `coverArtUrlForAttempt`'s fallback-chain logic is
exported and unit tested directly (5 cases covering both the
real-URL-first and guess-only paths).

## 2026-08-08 — Steam cover art zoomed in; switched object-cover to object-contain

Once the real Steam-API cover art URL (above) started loading, both
Palworld and Forza Horizon 6 looked "zoomed in" — cropped tight on the
character/car, losing the surrounding image. The two previously-guessed
CDN conventions (`header.jpg`, `capsule_616x353.jpg`) happen to be close
to 16:9, so `object-cover`'s crop was barely noticeable; the real URL
Steam's appdetails API returns isn't guaranteed to match that aspect
ratio at all, and `object-cover` crops aggressively to fill the box
regardless of the source's actual shape.

Switched to `object-contain` (with the same neutral background used by
the "No cover art" placeholder as letterbox fill) so the whole image is
always visible, whatever aspect ratio Steam happens to return — avoids
re-guessing at exact dimensions for a fix that would only hold for
today's asset shapes.

## 2026-08-08 — Timeline: fixed wrong timestamps and calendar-day grouping

Two real bugs, both timezone-related:

- `TIME_FORMAT` in `timeline/page.tsx` had no `timeZone` set, so it
  rendered in the server's own timezone (UTC on Vercel) instead of
  `HERO_TIME_ZONE` (Asia/Kuching, UTC+8) — every timestamp shown was 8
  hours off from real local time. `HERO_TIME_ZONE` is now exported from
  `@pulse/widget-hero`'s index and used directly (apps/web sits above
  widgets in the dependency graph, so this isn't the "duplicate as a
  literal" workaround adapters need — see `contributions.ts`'s comment
  for why that one's different).
- `groupMemoriesByRecency`'s Today/Yesterday bucketing compared raw
  elapsed hours (`daysAgo <= 0` / `=== 1`), not calendar days — an entry
  from earlier today could show as "Yesterday," or an entry from
  yesterday as "Today," depending on what time of day "now" fell at.
  Switched Today/Yesterday specifically to compare calendar-date
  strings in `HERO_TIME_ZONE` (same `Intl.DateTimeFormat("en-CA", ...)`
  pattern `contributions.ts` already uses for "today"). The coarser
  Last Week/month buckets stay elapsed-time based — an off-by-one there
  is far less noticeable than misclassifying "today" as "yesterday."
  New test file covers both directions of the bug (an entry under 24
  raw hours old that's a different calendar day, and one over the UTC
  day boundary that's still today locally).

Also added a short date (`Aug 8`) next to the time on every entry, by
request — previously only the group header (Today/Yesterday/Last
Week/month) gave any date context, which was ambiguous for the
multi-day Last Week and month buckets.

## 2026-08-08 — Timeline: per-source icons, clickable entries, per-day counts

By request, four presentation-only additions to the M1 Timeline page
(`docs/MEMORY_ROADMAP.md`) — deliberately stopping short of M2's actual
daily/weekly rollups, which are their own milestone:

- **Per-source icon badge** on every entry, reusing each widget's own
  icon component (`GitHubIcon`/`SteamIcon`/`SpotifyIcon`, newly exported
  from their packages' `index.ts`) in the same outlined accent-badge
  treatment `WidgetCard` uses — `ACCENT_BADGE` exported from
  `@pulse/ui` rather than duplicating the class string. Notebook/Notes/
  Tasks use their existing lucide icons directly (no dedicated icon
  component in those packages to reuse).
- **Small source label** under each entry's description (e.g. "GitHub",
  "Steam") — same source→label mapping as the icon, in
  `apps/web/src/lib/memory-sources.tsx`.
- **Clickable entries where a real link exists**: GitHub PR memories
  already stored `metadata.url`; added `metadata.appId` to Steam's
  `deriveSteamMemories` so its entries can link to `/steam/[appId]`.
  Notebook/Notes/Tasks link to their list pages (no per-item detail page
  exists for those). Spotify has no page to link to, so its entries stay
  plain — `memoryHref()` returns `null` and the row renders as a `div`,
  not a link. External links (GitHub) use a plain `<a target="_blank">`;
  internal ones use `next/link`'s `Link`, matching how this same file
  already links back to the dashboard. `memoryHref`/`isExternalHref`
  are pure functions, unit tested directly (9 cases).
- **Per-day count** in each group header (`TODAY · 4`) — cheap, gives a
  sense of how busy a day was without needing real summarization.

Verified the row rendering (icon badge sizing, source label, date/time,
clickable-vs-plain rows resolving to the right element/href) with a
temporary preview route rendering `MemoryRow` against representative
mock data across all four link cases (external, internal-with-metadata,
internal-static, non-clickable) — screenshotted and DOM-inspected, then
deleted; not left behind as a permanent route.

## 2026-08-08 — Auth.js session strategy: database → JWT

A performance audit (`PERFORMANCE_AUDIT.md`) identified `session: {
strategy: "database" }` (`packages/auth/src/config.ts`) as the single
largest contributor to a reported "every click has a small delay"
symptom: with the database strategy, Auth.js's `auth()` — called on
every page render and every server action, not just at sign-in — does a
live Postgres round trip through `SupabaseAdapter` to validate the
session token, every time.

Switched to `session: { strategy: "jwt" }`. The `SupabaseAdapter` stays
wired up unchanged — it still owns account/user persistence (GitHub
OAuth linking, the `next_auth.users` row `readUserName`/
`readProviderAccessToken` read from); only how a session is *validated*
per request changes, from a DB lookup to a signed-cookie decrypt. Added
a `jwt()` callback (`config.ts`) that persists the adapter-created
user's `id` onto the token on initial sign-in — `session()` now reads
`token.id` instead of the database-strategy-only `user` parameter it
used to receive. `session.user.id`'s value and every consumer of it
(every server action's `auth()` call, every page) is unchanged — only
how that value gets there is different.

The usual `declare module "next-auth/jwt" { interface JWT { id: string
} }` augmentation (the documented way to type this) doesn't resolve
under this repo's `moduleResolution: "Bundler"` setting — a real
TypeScript limitation with ambient module augmentation for a subpath
export, confirmed via `tsc --traceResolution` (the module resolves
successfully as an *import*, but the augmentation checker still reports
"cannot be found" — a known divergence between the two resolution paths
under Bundler mode). Worked around by reading `token.id` as `unknown`
and casting to `string` at its one consumption site in `session()`
(`config.ts`) instead, with a comment pointing here; `types.ts` keeps a
comment explaining why the augmentation was dropped rather than left as
a silent gap.

No new env vars — `AUTH_SECRET` (already required) is what signs/
encrypts the JWT cookie under either strategy.

Part of a broader implementation pass working through
`IMPLEMENTATION_PLAN.md` (the master plan consolidating
`PERFORMANCE_AUDIT.md`/`UX_AUDIT.md`/`ARCHITECTURE_AUDIT.md`/
`FEATURE_GAP_REPORT.md`), landed alongside `loading.tsx` for every route
(`apps/web/src/app/{loading,tasks/loading,notes/loading,notebook/loading,
timeline/loading,steam/[appId]/loading}.tsx`) — the audit's other
Critical finding for the same symptom: no route had an instant
Next.js-driven loading UI, so navigation sat frozen behind whatever
`await`s the target page made (including the now-fast JWT `auth()`
call) with zero visual feedback that a click had registered.

## 2026-08-08 — Narrow per-widget cache invalidation, replacing the dashboard's full-reload-on-any-refresh behavior

`PERFORMANCE_AUDIT.md`'s C3/H1 findings: `page.tsx`'s `WidgetSlot` reads
every registered widget's cache + settings on every dashboard render (2
Supabase queries × ~7 widgets = up to 14 round trips), and every refresh
action (`refreshWidgetAction`, the notes/tasks/notebook/hero actions,
`updateWidgetSettingsAction`) called `revalidatePath("/")` — which,
since nothing cached those reads, meant refreshing *one* widget forced
all ~14 round trips to re-run, not just the one that changed.

Added `apps/web/src/lib/widget-data-cache.ts`: `readCachedWidgetCache`/
`readCachedWidgetSettings` wrap `readWidgetCache`/`readWidgetSettings`
in `unstable_cache`, tagged per `(userId, widgetId)`
(`widget-cache:<userId>:<widgetId>` / `widget-settings:<userId>:<widgetId>`),
with `revalidate` set to the widget's own declared `refreshInterval`
(already a per-widget field on `Widget`, see packages/sdk/src/widget.ts)
as a time-based safety net. `page.tsx`'s `WidgetSlot` now reads through
these instead of calling `readWidgetCache`/`readWidgetSettings` directly.

Rather than adding a `revalidateTag` call at every one of the many
call sites that mutate a widget's cache (cron, every refresh action,
every notes/tasks/notebook/hero write action), centralized it in
`refreshWidget` itself (`apps/web/src/lib/refresh-widget.ts`) — every
one of those call sites already calls `refreshWidget`, so adding one
`revalidateWidgetTag(widgetCacheTag(userId, widgetId))` call there
after the cache write covers all of them for free, including the cron
route, which previously had no invalidation story at all for this new
cache layer. `updateWidgetSettingsAction` additionally revalidates the
settings tag directly, since `writeWidgetSettings` is a separate write
`refreshWidget` doesn't know about. Existing `revalidatePath("/")`
calls were kept as-is (still needed to tell the client's Router Cache
to refetch the route) — this change is additive to that, not a
replacement for it.

Real snag: this installed Next.js version's `revalidateTag(tag)` type
signature actually requires a second `profile` argument (part of a
newer "Cache Components" caching model this app doesn't otherwise use
anywhere — no `"use cache"` directive, no `cacheLife`/`cacheTag` calls,
no `experimental.cacheComponents` in `next.config.ts`), so a bare
single-argument call fails `tsc`. Added `revalidateWidgetTag` in
`widget-data-cache.ts` as the one place that calls the real
`revalidateTag(tag, "max")` with a comment explaining the required
second argument doesn't change this app's actual behavior — it's a
byproduct of this Next version's type surface, not a deliberate opt-in.

Also confirmed no regression to the app's core freshness guarantee
(every device reads the same cron-refreshed data — reference doc §4):
the cron scheduler calls `refreshWidget` per `(user, widget)` exactly
as before, so it now also revalidates each tag it touches; a dashboard
visit picks up a background cron refresh either via that immediate
invalidation or, worst case, within the widget's own `refreshInterval`
via `unstable_cache`'s `revalidate` bound — never staler than the
widget already accepted being stale for by design.

## 2026-08-08 — Undo-able delete for Tasks and Notes

`UX_AUDIT.md`'s M2 and `FEATURE_GAP_REPORT.md`'s #3 both flagged the
same real risk: `TaskRow`'s delete button sits at the same 44×44px
touch target right next to its checkbox, and deleted immediately with
no confirmation or recovery — a plausible mis-tap during a rushed
morning check permanently loses a task. Notes' delete (inside
`NoteModal`) had the same instant, irreversible shape.

Added `packages/ui/src/use-undoable-delete.ts` (`useUndoableDelete`,
exported from `@pulse/ui`): clicking "Delete" no longer submits the
real delete action — it starts a 5-second window showing an inline
"Undo" affordance instead. If undone, nothing is ever submitted to the
server; if the window elapses, the real delete form (kept mounted but
hidden, via a `formRef`) is submitted via `requestSubmit()` — the same
programmatic-submit pattern already used elsewhere in this codebase
(`RefreshAllTitle`, `NotebookInput`). Deliberately client-only, no
server-side "soft delete" — an undone delete simply never reaches the
database. Wired into `TaskRow` (`packages/widgets/tasks/src/task-row.tsx`)
and `NoteModal` (`packages/widgets/notes/src/note-modal.tsx`), the two
places a user-authored item can be deleted today.

One deliberate behavior worth naming: `NoteModal`'s pending-delete timer
survives the modal being closed (Escape/backdrop) while the undo window
is still open, since `NoteModal` itself stays mounted across `open`
toggling (only `Modal`'s own rendered output is conditional) — closing
the modal doesn't cancel the pending delete, matching how a
Gmail-style "Undo Send" toast outlives navigating away from the
compose window. Reopening the same note before the window elapses
correctly shows the same pending "Undo" state, not the edit form.

## 2026-08-08 — Removed the Habits/Reading "Coming soon" placeholder cards

`UX_AUDIT.md`'s S1 and `FEATURE_GAP_REPORT.md`'s #9 both flagged the
same thing: two full `WidgetCard`s reading "Coming soon" rendered on
*every* dashboard visit, styled almost identically to real widgets
(same card shell, icon badge, title treatment) just at reduced opacity
— reading as broken widgets on first glance rather than intentionally
unbuilt ones, and a permanent small reminder of unfinished work on a
page whose whole design goal is calm and considered.

Removed both cards from `apps/web/src/app/page.tsx`'s `WidgetGrid`
(and the now-unused `BookOpen`/`ListChecks` icon imports) rather than
redesigning them to read as more clearly provisional — matches the
same "don't scaffold ahead of need" principle `CLAUDE.md` already
applies to nav links, and both audits' first recommended option.
Habits itself is unchanged in scope — still not started, still on the
Phase 2 backlog (`docs/ROADMAP.md`) — only the placeholder UI is gone;
`docs/ROADMAP.md` and `docs/PROJECT_REFERENCE.md` updated to say so
rather than continuing to describe a card that no longer exists.
