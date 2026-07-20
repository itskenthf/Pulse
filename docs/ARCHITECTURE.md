# Architecture

See `docs/PROJECT_REFERENCE.md` for the full rationale. This doc is the
practical "how do I add a widget" / "how does data flow" reference, kept in
sync with the actual code as it's built.

## Monorepo layout

pnpm workspaces + Turborepo. `pnpm-workspace.yaml` includes `apps/*` and
`packages/*`. Each package/app has its own `package.json` and depends on
others via `workspace:*` — Turborepo figures out build order from that
dependency graph (`turbo.json`'s `dependsOn: ["^build"]`).

- `apps/web` — the Next.js shell: auth, routing, the widget grid, layout.
  Never imports a specific widget's internals — only `@pulse/sdk`'s
  `registerWidget` / `getAllWidgets`.
- `packages/sdk` — the `Widget` interface (see below) and the in-memory
  registry. This is the only contract the shell depends on.
- `packages/auth` — Auth.js configuration (providers, adapter). Exported as
  `authConfig`, consumed by `apps/web/src/auth.ts`.
- `packages/database` — Supabase client factory. `createServiceClient()` is
  server-only (uses the service role key, bypasses RLS) — never import it
  into a client component.
- `packages/widgets/*` — one package per widget, added as each widget is
  built (Phase 1). Not scaffolded ahead of need.
- `packages/adapters/*` — one package per external service (GitHub, Google,
  Spotify, Weather, YouTube). Added alongside the first widget that needs
  them.
- `packages/ui` — shared design system components (the one reusable card
  component from §19, etc.). Added when the shell needs its first shared
  component beyond raw Tailwind.

## Widget SDK contract

```ts
// packages/sdk/src/widget.ts
export interface Widget<TData = unknown, TSettings = Record<string, never>> {
  id: string;
  name: string;
  size: WidgetSize; // "sm" | "md" | "lg"
  refreshInterval: number; // seconds
  fetchData(context: WidgetFetchContext): Promise<TData>;
  render(props: WidgetRenderProps<TData, TSettings>): ReactNode;
  settings?(): TSettings;
  permissions?(): string[];
}
```

The shell only ever calls `registerWidget(SomeWidget)` and later
`getAllWidgets()` to render the grid. It never imports a widget's
`fetch.ts` or `component.tsx` directly — that's what keeps "add a widget =
add a file" true.

## Data flow: cron-first, never direct

```
External API → Scheduler (cron) → widget_cache (Supabase) → Dashboard read
```

`fetchData()` is only ever called by the scheduler, never by the client.
The dashboard always reads from `widget_cache` — it never calls an external
API directly. This is what keeps every device consistent and avoids rate
limits. The scheduler mechanism (Vercel Cron, Supabase Edge Functions,
GitHub Actions) is an implementation detail behind this boundary and can be
swapped without touching any widget.

## Adding a widget (once Phase 1 begins)

1. Create `packages/widgets/<name>/` with `widget.ts`, `component.tsx`,
   `types.ts`, `fetch.ts`, `settings.ts`, `icon.tsx`.
2. If it talks to a new external service, add `packages/adapters/<service>/`
   — auth, requests, response normalization live there, not in the widget.
3. Implement the `Widget` interface in `widget.ts`, call `registerWidget()`.
4. Wire `fetch.ts` into the scheduler so it writes to `widget_cache`.
5. Confirm it meets every item in the reference doc's definition of done
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
data source, so adding a widget never requires a migration.

## Event bus

Not built. Deferred until 2-3 widgets have a genuine need to react to each
other (see reference doc §5, §20). `widget_events` exists in the schema as a
placeholder but nothing reads or writes it yet.
