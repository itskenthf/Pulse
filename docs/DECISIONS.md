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
