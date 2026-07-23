# Architecture

See `docs/PROJECT_REFERENCE.md` for the full rationale. This doc is the
practical "how do I add a widget" / "how does data flow" reference, kept in
sync with the actual code as it's built.

## Monorepo layout

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

pnpm workspaces + Turborepo. `pnpm-workspace.yaml` includes `apps/*`,
`packages/*`, `packages/widgets/*`, and `packages/adapters/*` (nested globs
need to be listed explicitly — pnpm doesn't recurse `packages/*`
automatically). Each package/app has its own `package.json` and depends on
others via `workspace:*` — Turborepo figures out build order from that
dependency graph (`turbo.json`'s `dependsOn: ["^build"]`).

- `apps/web` — the Next.js shell: auth, routing, the widget grid, the cron
  route. Never imports a specific widget's internals — only `@pulse/sdk`'s
  `registerWidget` / `getAllWidgets`, plus each widget's single top-level
  export (e.g. `weatherWidget` from `@pulse/widget-weather`).
- `packages/sdk` — the `Widget` interface (see below) and the in-memory
  registry. This is the only contract the shell depends on.
- `packages/auth` — Auth.js configuration (providers, adapter, the
  `session.user.id` type augmentation). Exported as `authConfig`, consumed
  by `apps/web/src/auth.ts`.
- `packages/database` — Supabase client factory plus generic
  `widget_cache`/`widget_settings`/`widget_registry`/user helpers that any
  widget's fetch/settings code reuses (`readWidgetCache`, `writeWidgetCache`,
  `readWidgetSettings`, `writeWidgetSettings`, `ensureWidgetRegistered`,
  `listUserIds`, `readProviderAccessToken`). `createServiceClient()` is
  server-only (uses the service role key, bypasses RLS) — never import it
  into a client component. `readProviderAccessToken(userId, provider)`
  reads a stored OAuth token from `next_auth.accounts` — this is how a
  widget gets API access for a service the user already signed in with
  (the GitHub widget uses this; Spotify will too), without a second OAuth
  connection.
- `packages/widgets/*` — one package per widget. `packages/widgets/weather`
  is the reference implementation — copy its shape for the next one.
- `packages/adapters/*` — one package per external service. Owns the actual
  HTTP call and response normalization; widgets never fetch raw API
  responses themselves.
- `packages/ui` — shared design system components: `WidgetCard` (the one
  reusable card from §19) and `ActionForm` (generic `useActionState` wiring
  — pending/error UI — reused for every widget action, not just weather's).

## Widget SDK contract

```ts
// packages/sdk/src/widget.ts
export interface Widget<TData = unknown, TSettings = Record<string, unknown>> {
  id: string;
  name: string;
  size: WidgetSize; // "sm" | "md" | "lg"
  refreshInterval: number; // seconds
  fetchData(context: WidgetFetchContext): Promise<TData>;
  render(props: WidgetRenderProps<TData, TSettings>): ReactNode;
  settings?(): TSettings;
  parseSettingsForm?(formData: FormData): TSettings;
  permissions?(): string[];
}
```

`render()` receives `{ data, settings, actions }` — `actions.refresh` and
`actions.updateSettings` are server actions the **shell** constructs
(session lookup + cache/settings writes happen in `apps/web`) and hands
down, so a widget never needs to import auth or database code to trigger
them. See `docs/DECISIONS.md` for why this was added.

The shell only ever calls `registerWidget(SomeWidget)` and later
`getAllWidgets()` to render the grid. It never imports a widget's
`fetch.ts` or `component.tsx` directly — that's what keeps "add a widget =
add a file" true.

## Data flow: cron-first, never direct

```
External API → Scheduler (GitHub Actions) → widget_cache (Supabase) → Dashboard read
```

`fetchData()` is only ever called by the scheduler (`apps/web/src/app/api/cron/route.ts`,
triggered by `.github/workflows/refresh-widgets.yml`) or by a user-triggered
manual refresh — never automatically by the client on render. The dashboard
always reads from `widget_cache`. This is what keeps every device
consistent and avoids rate limits. GitHub Actions was picked over Vercel
Cron specifically because Vercel's Hobby tier only allows daily cron jobs —
see `docs/DECISIONS.md`. The scheduler is still just an implementation
detail behind the `GET /api/cron` boundary and can be swapped again without
touching any widget.

## Adding a widget

1. Create `packages/widgets/<name>/` — use `packages/widgets/weather` as
   the template: `constants.ts`, `types.ts`, `settings.ts` (defaults +
   `parseSettingsForm`), `fetch.ts` (calls an adapter, reads settings,
   calls `ensureWidgetRegistered`), `icon.tsx`, `component.tsx` (wraps
   `WidgetCard`/`ActionForm` from `@pulse/ui`), `widget.ts` (implements
   `Widget`), `index.ts`.
2. If it talks to a new external service, add `packages/adapters/<service>/`
   — auth, requests, response normalization live there, not in the widget.
3. In `apps/web/src/lib/register-widgets.ts`, import the widget's package
   and call `registerWidget()`.
4. Add the new package to `apps/web/package.json` dependencies.
5. Nothing else to wire — the dashboard page, cron route, and refresh/settings
   actions in `apps/web/src/app/actions/widgets.ts` are all already generic
   over every registered widget.
6. Confirm it meets every item in the reference doc's definition of done
   (§7) before calling it finished — including dark mode and responsive
   layout, not just "it fetches data."

## Auth

Auth.js (NextAuth v5) owns login and session; Supabase is Postgres-only.
See `docs/DECISIONS.md` for why, and `supabase/migrations/0000_next_auth_schema.sql`
for the adapter's schema. `apps/web/src/auth.ts` exports `auth`, `signIn`,
`signOut`, and the route handlers wired at
`apps/web/src/app/api/auth/[...nextauth]/route.ts`.

## Database

`supabase/migrations/` — applied in order. `0000` is the Auth.js adapter
schema (owned by `@auth/supabase-adapter`, not hand-edited). `0001` is
Pulse's application schema per the reference doc §8: one generic
`widget_cache` table keyed by `(user_id, widget_id)` rather than a table per
data source, so adding a widget never requires a migration. `0002` grants
`service_role` access to everything in `public` — tables created via raw
SQL in the Supabase SQL Editor don't get the grants Supabase's Table
Editor UI applies automatically (see `docs/DECISIONS.md`).

Note: `widget_settings.widget_id` and `widget_cache.widget_id` both
foreign-key to `widget_registry.id`. A widget's registry row is created
lazily by `ensureWidgetRegistered()` — called from both `fetchData()` (via
each widget's `fetch.ts`) and the shell's settings-save action
(`apps/web/src/app/actions/widgets.ts`), so a widget works correctly
regardless of whether its first-ever interaction is a fetch or a settings
save.

## Event bus

Not built. Deferred until 2-3 widgets have a genuine need to react to each
other (see reference doc §5, §20). `widget_events` exists in the schema as a
placeholder but nothing reads or writes it yet.
