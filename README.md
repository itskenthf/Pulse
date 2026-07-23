# Pulse

A personal "life OS" dashboard — the daily tools Ken checks every morning,
rendered as independent widgets on one screen, kept in sync across desktop,
mobile, and browser. Live at
[[redacted-old-domain]](https://[redacted-old-domain]).

Pulse is not a dashboard with features bolted on — it's a shell that renders
widgets. The shell knows how to register and lay out a widget; it knows
nothing about weather, GitHub, or Steam. See `docs/ARCHITECTURE.md` for why,
and `docs/PROJECT_REFERENCE.md` for the full spec this project is built
against. Current widget lineup and what's next: `docs/ROADMAP.md`.

## Project structure

```
apps/
  web/                Next.js app (App Router) — dashboard shell, auth, routing, cron route
packages/
  ui/                 Shared design system components (WidgetCard, ActionForm)
  sdk/                Widget interface/contract — what the shell depends on
  auth/               Auth.js configuration
  database/           Supabase client, widget_cache/widget_settings/registry/account/user helpers
  widgets/
    weather/          Location-based current conditions (Open-Meteo)
    greeting/         Time-of-day message, no external service
    clock/            Live client-ticking clock, no external service
    github/           Contribution counts + mini heatmap (reuses your GitHub login token)
    steam/            Recently played games
  adapters/
    weather/          Open-Meteo client
    github/           GitHub GraphQL contributions client
    steam/            Steam Web API client
supabase/
  migrations/         SQL migrations, applied in order
docs/                 Architecture, roadmap, design system, decisions
```

See `docs/ROADMAP.md` for what's live vs. planned. New widgets each get
their own `packages/widgets/<name>` and, if they talk to an external
service, `packages/adapters/<name>` — see `docs/ARCHITECTURE.md` for the
exact steps.

## Requirements

- Node.js 22+
- pnpm 10+ (`corepack enable` will pick up the pinned version)
- A Supabase project (Postgres only — see `docs/DECISIONS.md`)
- A GitHub OAuth App (login provider — also powers the GitHub widget, no
  extra setup needed for that one)
- A Steam Web API key, only if you want the Steam widget — see "Widgets
  needing extra setup" below

## Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Copy `.env.example` to `apps/web/.env.local` and fill in the values:
   - `SUPABASE_URL` — Settings → Data API → Project URL (or derive it from
     your project ID: `https://<project-id>.supabase.co`).
   - `SUPABASE_SERVICE_ROLE_KEY` — Settings → API Keys → **"Legacy anon,
     service_role API keys"** tab → `service_role` (a JWT starting with
     `eyJ...`). Use the legacy key, not the newer `sb_secret_...` one —
     `@auth/supabase-adapter` doesn't work with the new format yet, see
     `docs/DECISIONS.md`. Server-only, never expose this to the client.
   - `AUTH_SECRET` — generate with `npx auth secret`.
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from a GitHub OAuth App
     (github.com/settings/developers). Set the callback URL to
     `http://localhost:3000/api/auth/callback/github` for local dev.

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase
   project, in order, via the Supabase SQL editor or CLI. Then go to
   Settings → Data API → Exposed schemas and add `next_auth` — it isn't
   exposed by default, only `public` and `graphql_public` are, and the auth
   adapter can't read/write its tables until it's added.

4. Run the dev server:

   ```
   pnpm dev
   ```

5. Open `http://localhost:3000` and sign in with GitHub — this is the
   Phase 0 gate: you should see your own name echoed back. If you get a
   generic Auth.js error, check `docs/DECISIONS.md` for the specific
   gotchas above (legacy key, exposed schema, and — if deploying to
   multiple domains — cookie/domain mismatches).

## Widget refresh scheduler (GitHub Actions)

Widgets refresh on their own schedule via a GitHub Actions workflow
(`.github/workflows/refresh-widgets.yml`), not Vercel Cron — see
`docs/DECISIONS.md` for why. To turn it on:

1. Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Add it as `CRON_SECRET` in Vercel → Settings → Environment Variables,
   and redeploy.
3. In the GitHub repo → Settings → Secrets and variables → Actions:
   - Add a **repository secret** named `CRON_SECRET` with the same value.
   - Add a **repository variable** named `PULSE_URL` set to your deployed
     URL (e.g. `https://[redacted-old-domain]`, no trailing slash).
4. The workflow runs every 30 minutes automatically. You can also trigger
   it manually from the Actions tab ("Run workflow") to test it
   immediately rather than waiting.

Without this, widgets still work via the manual "Refresh" button on each
card — the scheduler just means you don't have to click it yourself.
Confirmed working: the scheduler runs every 30 minutes and refreshes every
registered widget for every user.

## Widgets needing extra setup

Most widgets work automatically once you're signed in — they use either no
external service (Greeting, Clock) or the token you already got from
signing in with GitHub (the GitHub widget). A couple need something extra:

- **Steam** — needs a Steam Web API key and your SteamID64:
  1. Get a key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
     (any domain value is accepted; requires a non-"limited" Steam account,
     i.e. one that's made at least one purchase).
  2. Add it as `STEAM_API_KEY` in Vercel → Settings → Environment
     Variables (and `turbo.json`'s `build.env` already lists it — no code
     change needed for a fresh deploy), then redeploy.
  3. On the dashboard, open the Steam card's Settings and enter your
     17-digit SteamID64 (look it up at [steamid.io](https://steamid.io) if
     your profile uses a custom URL).
  4. Your Steam profile's **Game details** privacy must be set to Public
     — Steam silently returns an empty list otherwise, with no error.
- **Calendar, Email, YouTube (Google-backed widgets)** — deferred, not yet
  built. See `docs/ROADMAP.md`.

## Development

- `pnpm dev` — run the web app
- `pnpm build` — build all packages
- `pnpm lint` — lint
- `pnpm typecheck` — typecheck all packages

See `docs/ROADMAP.md` for what's built and what's next, and
`docs/ARCHITECTURE.md` for how a new widget gets added.
