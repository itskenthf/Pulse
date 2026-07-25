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
separate cards, e.g. "Good Morning Ken / Today / 29°C Cloudy / Continue
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

**Context:** after redesign v2 shipped (previous entry), Ken asked for
several further changes, each with a real tradeoff worth recording:

**1. Dark mode.** Ken wants light-blue only, matching the design reference
exactly. This is a direct exception to reference doc §7's "dark mode
support" line in the definition of done. Flagged this before touching
anything, since CLAUDE.md requires explaining + explicit approval before
contradicting the reference doc. Given the choice between deleting all
`dark:` classes (matches the ask exactly, but throws away something already
working and correctly styled) versus keeping them as an unmaintained
fallback (costs nothing to leave in place, protects anyone who hits Pulse
in OS/device dark mode from a broken/blinding page), Ken chose to keep the
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
  user). Presented these tradeoffs to Ken; he chose the simplest option:
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

Investigated Spotify for the same treatment (Ken's original ask mentioned
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

**Context:** Ken reviewed the live deploy and reported two things beyond
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
Pulse is a single-page app with nothing to navigate between. Ken directly
asked for one back, as a placeholder for future sections — this is new,
explicit direction, not a silent contradiction, so implemented without
further back-and-forth (still flagged as a reversal here per CLAUDE.md's
spirit of recording real architectural decisions with reasoning). Built as
a 64px icon rail: "Dashboard" is the only real, active item; "Tasks" and
"Habits" are visibly disabled with a "coming soon" title and no `href` —
UI signposting, not scaffolded feature infrastructure (no new routes, no
new DB tables, no backend logic) — keeps faith with the project's
"don't scaffold future features ahead of need" rule while still giving Ken
the visual placeholder he asked for.

**3. Card accents.** "Every widget is white" — added `WidgetCard`'s
`accent?: "blue" | "green" | "indigo" | "none"` prop, a `border-l-4` colored
left border rather than recoloring the whole card (keeps the light-blue
theme's restraint). Assigned by feel where Ken didn't specify exactly:
GitHub blue (matches its existing icon badge), Spotify green (nods to
Spotify's own brand color), Steam indigo (a distinct darker blue). Left
Quick Launch unaccented rather than inventing a color with no rationale.
Ken's list also named "Weather" (sky gradient) and "Calendar" (purple) —
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
"Continue working on Pulse" became "Continue where you left off." — Ken
gave two alternative greeting styles as examples; this keeps the first
one's headline+date structure (already in place) and borrows the second
one's warmer tagline phrase, rather than picking one wholesale.

## 2026-07-24 — New design system spec adopted: Liquid Glass, not light-blue flat

Ken provided a complete, authored `docs/DESIGN_SYSTEM.md` replacing the
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
temporary drift: Ken said the actual redesign implementation will follow in
a separate prompt — this commit is scoped to landing the spec doc itself so
it's the source of truth to build against, not to also rewriting the app in
the same pass. `PROJECT_REFERENCE.md` §19 and the rest of `DESIGN_SYSTEM.md`'s
now-superseded sections will be reconciled once that implementation work
happens, not before — recording the gap here so it isn't mistaken for
`DESIGN_SYSTEM.md` already matching reality.

## 2026-07-24 — Full redesign: Liquid Glass, replacing the light-blue flat theme

**Context:** Ken reviewed the live V4 (light-blue, masonry grid, sidebar,
colored left borders) and rejected it as a redesign target — "functional,
but not achieving the intended experience." His words: it feels like an
admin panel, a collection of white cards, unfinished, visually flat, too
much unused whitespace, poor visual hierarchy, weak component identity.
He asked for a critique-then-redesign against the newly adopted
`docs/DESIGN_SYSTEM.md` spec (previous entry), explicitly authorizing
structural change ("challenge the existing layout if necessary... the
current implementation is only a prototype").

**Critique of V4** (given in full to Ken before implementing, summarized
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
   "avoid thick colored stripes" and Ken's "outdated" callout. Identity now
   comes from a soft colored glow behind each widget's icon badge
   (`WidgetCard`'s `accent` prop, `box-shadow` glow + tinted badge, not a
   border) — GitHub blue, Spotify green (Spotify's own brand color), Steam
   indigo (a distinct darker blue). Quick Launch stays unaccented, same
   reasoning as before: no invented color with no rationale.

5. **Hero rebuilt as one grouped glass panel**, not floating text: a large
   greeting, then a row of three distinct "today" chips (date/time,
   weather, quote) — each its own small glass surface, read as related but
   individually legible, addressing "orphaned facts under a headline."
   Did **not** add an "Upcoming focus" field Ken's brief mentioned as
   optional — there's no real task data behind it (no Tasks widget exists
   yet), and Pulse's established pattern (Spotify's play-count decision) is
   to never fabricate a fact that isn't real. Left a clean gap for it once
   a real Tasks widget exists rather than inventing placeholder content.

6. **Adaptive navigation, not responsive resizing** (this section came
   from a follow-up message Ken sent while implementation was already
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
   per Ken's "either is acceptable, don't leave it as placeholder" —
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

**Context:** Ken confirmed the Liquid Glass redesign was "a major
improvement... much closer to the intended direction" and explicitly said
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
feature addition, not polish, and out of scope for a pass Ken explicitly
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
component — judged not worth it for Ken's personal-use dashboard on a
Chrome/Firefox/Edge-first assumption; flagged here in case it's ever worth
revisiting.

**6. Desktop navigation: dock, not rail.** Ken flagged the pinned sidebar
rail as "still feels disconnected" and asked to explore a bottom-center
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

**Explicitly out of scope for this pass, per Ken's instruction:** Spotify's
"now playing" emphasis treatment, and the git commit-signature stop-hook
warning (those are GitHub's own web-UI merge-commit attribution, not
something to rewrite history over — explained to Ken twice already,
not revisited here).

## 2026-07-24 — Reference-matched gradient, Steam achievements, icon-only Quick Launch

**Context:** Ken shared a reference screenshot (a mockup with broken image
placeholders — "Game art or browse", "Cover or browse" — showing the
*intent* was real cover art / track art / service icons, not that the
placeholders themselves were the design) and asked for: the background and
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
   songs" in the reference) — Ken chose to skip this. Correctly so: it's a
   real, nontrivial feature (deriving "what to resume" from live Steam/
   Spotify state, plus real deep-link behavior like `steam://run/<appid>`)
   that would have expanded this pass well beyond "polish," and skipping it
   was offered as an explicit option rather than assumed.
3. **Quick Launch icons.** Ken chose fetching each link's own
   `favicon.ico` directly over a third-party favicon proxy (e.g. Google's
   service) or a manual icon picker — no new dependency on a third party
   knowing every domain the user links to, same trust boundary as visiting
   the site.
4. **Steam depth.** Ken chose to add real achievement data *and* reduce
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

## 2026-07-24 — Renamed Vercel domain to my-pulse-os.vercel.app

Ken renamed the Vercel project's domain from the auto-generated
`pulse-plum-seven.vercel.app` to `my-pulse-os.vercel.app` (free rename via
Vercel's project settings, not a purchased custom domain — Vercel keeps
the old domain as a 307 redirect to the new one, so nothing broke
mid-transition). Three things had to match the new domain for auth to
keep working, all external-dashboard changes Ken made himself (not
reachable from this environment):

- Vercel env var `AUTH_URL` → `https://my-pulse-os.vercel.app`
- GitHub OAuth App's Authorization callback URL →
  `https://my-pulse-os.vercel.app/api/auth/callback/github`
- Spotify app's Redirect URI →
  `https://my-pulse-os.vercel.app/api/auth/callback/spotify`

No app code hardcodes the domain (`AUTH_URL` env var is the single source
used to build callback URLs — see `apps/web/src/app/api/auth/callback/spotify/route.ts`
and `packages/auth`), so this was a docs-only fix on the repo side —
`docs/ROADMAP.md`'s Phase 0 entry updated to the new domain.

## 2026-07-25 — Mobile click bug fix, nav removal, GitHub/Steam/Hero content pass

Ken tested the previous redesign on real mobile/iPad hardware and reported
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
Ken reported in the same message: square per-item hover backgrounds poking
past the dropdown's rounded corners.

`ActionForm` (`packages/ui/src/action-form.tsx`) gained an optional
`onSubmitted` callback, fired once a `useActionState` action settles
without error (tracked via a `wasPending` ref across renders) — used by
`WidgetMenu` to close the dropdown after a successful Refresh click,
otherwise the menu stayed open over the fresh content.

**Navigation removed entirely, not just hidden.** Ken said he never uses
the sidebar/dock/bottom-nav ("all i need is just to see cards") —
confirmed via `AskUserQuestion` that this meant deleting `Sidebar`, `Dock`,
`BottomNav`, and the `DRAWER_ID` checkbox-drawer plumbing from `page.tsx`
outright, not just hiding them behind a flag. The disabled Search and
Notification `NavIconButton`s were removed from the navbar too (Ken: "i
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
game-library-shelf screenshot Ken provided. Cover art uses Steam's CDN
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
were considered but deliberately left out of this pass: Ken's answer
confirmed the *style* (rule-based) but not this specific scope, and the
rest of this batch was already large enough without adding an
under-specified feature.

**Quick Launch**: tiles shrunk from `grid grid-cols-3` `aspect-square`
cells to `flex flex-wrap` with a fixed `h-11 w-11` per tile — Ken: "make it
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

Ken caught that the Steam card's cover art rendered portrait
(`library_600x900.jpg`) rather than the horizontal art from the reference
image he'd shared earlier. Switched `CoverArt`
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

Ken flagged the GitHub and Quick Launch cards as "too big" from a
production screenshot, wanted card hover to stop moving/scaling and
instead just lightly indicate cursor position, wanted Steam's cover art
hover to light up the border rather than animate, asked why cover art
wasn't loading for one game, and reported being unable to tap any button
at all on mobile — asked for a proper review pass and cleanup alongside.

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
Ken's ask was specific — no movement or scale on card hover, just "less
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
sign-in) — Ken's ask was about cards and cover art specifically, not
button press feedback, which is a different, expected interaction pattern.

**Steam cover art**: the `<a>` tile wrapping each game's `CoverArt` lost
`SPRING_PRESS` (was scaling the whole tile on hover) and gained `group`;
`CoverArt` (`packages/widgets/steam/src/cover-art.tsx`) now renders a
`ring-1 ring-transparent` that turns `group-hover:ring-sky-400/70` via
`transition-colors` — a border light-up with no scale, matching Ken's
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

Ken approved the visual direction as final ("do NOT redesign the
application") and asked for a senior-engineer quality pass instead:
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
one's label correctly: "Good afternoon, Ken", "GitHub", "Steam", "Quick
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
per Ken's confirmed preference, the fix targets the actual reproduced
problems (the grid row-height trap, the truncation-in-flex trap), not a
ground-up redesign of the responsive system. The existing `sm:`/`lg:`
breakpoint structure stays; only the *card-widgets* section changed
from a single grid to two flex columns.
