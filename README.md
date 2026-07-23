# Pulse

A personal "life OS" dashboard — the daily tools Ken checks every morning,
rendered as independent widgets on one screen. Live at
[[redacted-old-domain]](https://[redacted-old-domain]).

Pulse is a shell that renders widgets — it knows nothing about weather,
GitHub, or Steam specifically. See `docs/PROJECT_REFERENCE.md` for the full
spec, `docs/ARCHITECTURE.md` for how it's built, and `docs/ROADMAP.md` for
what's live and what's next.

## Tech stack

- **Next.js** (App Router) — frontend + backend, one codebase
- **Auth.js** (NextAuth v5) — authentication
- **Supabase** (Postgres) — data storage
- **Turborepo + pnpm** — monorepo
- **Vercel** — hosting
- **GitHub Actions** — scheduled widget data refresh

## Requirements

- Node.js 22+
- pnpm 10+ (`corepack enable` picks up the pinned version)
- A Supabase project
- A GitHub OAuth App

## Setup

1. Install dependencies:

   ```
   pnpm install
   ```

2. Copy `.env.example` to `apps/web/.env.local` and fill in the values.
   Notes on a couple of them live in `docs/DECISIONS.md` — particularly
   the Supabase service role key (use the **legacy** key, not the newer
   `sb_secret_...` format) and the `next_auth` exposed-schema requirement.

3. Apply the SQL migrations in `supabase/migrations/` to your Supabase
   project, in order.

4. Run the dev server:

   ```
   pnpm dev
   ```

5. Open `http://localhost:3000` and sign in with GitHub.

## Development

- `pnpm dev` — run the web app
- `pnpm build` — build all packages
- `pnpm lint` — lint
- `pnpm typecheck` — typecheck all packages

See `docs/ROADMAP.md` for what's built, what's next, and setup steps for
specific widgets (e.g. Steam, the scheduler); `docs/ARCHITECTURE.md` for
the codebase layout and how a new widget gets added.
