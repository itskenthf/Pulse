# Pulse

A personal "life OS" dashboard — the daily tools Ken checks every morning
(calendar, email, GitHub, weather, focus time, habits) rendered as
independent widgets on one screen, kept in sync across desktop, mobile, and
browser.

Pulse is not a dashboard with features bolted on — it's a shell that renders
widgets. The shell knows how to register and lay out a widget; it knows
nothing about calendars, GitHub, or Spotify. See `docs/ARCHITECTURE.md` for
why, and `docs/PROJECT_REFERENCE.md` for the full spec this project is built
against.

## Project structure

```
apps/
  web/        Next.js app (App Router) — the dashboard shell, auth, routing
  desktop/    Tauri wrapper around the web build (added in Phase 1 week 3)
packages/
  ui/         Shared design system components
  widgets/    One package per widget (calendar, github, spotify, ...)
  sdk/        Widget interface/contract — what the shell depends on
  adapters/   One adapter per external service (auth, API calls, normalization)
  auth/       Auth.js configuration
  database/   Supabase client + schema
  shared/     Cross-cutting utilities
supabase/
  migrations/ SQL migrations, applied in order
docs/         Architecture, roadmap, design system, decisions
```

## Requirements

- Node.js 22+
- pnpm 10+ (`corepack enable` will pick up the pinned version)
- A Supabase project (Postgres only — see `docs/DECISIONS.md`)
- A GitHub OAuth App (first login provider)

## Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Copy `.env.example` to `apps/web/.env.local` and fill in the values:
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase
     project's API settings. Server-only, never expose these to the client.
   - `AUTH_SECRET` — generate with `npx auth secret`.
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — from a GitHub OAuth App
     (github.com/settings/developers). Set the callback URL to
     `http://localhost:3000/api/auth/callback/github` for local dev.

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase
   project, in order, via the Supabase SQL editor or CLI.

4. Run the dev server:

   ```
   pnpm dev
   ```

5. Open `http://localhost:3000` and sign in with GitHub — this is the
   Phase 0 gate: you should see your own name echoed back.

## Development

- `pnpm dev` — run the web app
- `pnpm build` — build all packages
- `pnpm lint` — lint
- `pnpm typecheck` — typecheck all packages

See `docs/ROADMAP.md` for what's built and what's next, and
`docs/ARCHITECTURE.md` for how a new widget gets added.
