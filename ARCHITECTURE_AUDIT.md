# Pulse Architecture Audit

Date: 2026-08-08
Scope: folder structure, monorepo organization, widget system, code
duplication, type safety, API abstraction, component abstraction, custom
hooks, server actions, auth, Supabase, environment variables, shared
utilities, testing readiness, and future scalability — specifically, whether
this architecture comfortably supports 50+ widgets.

Findings only. Nothing has been changed.

---

## Executive summary

Pulse's architecture is unusually disciplined for a solo project — the
widget SDK contract, adapter layer, generic `widget_cache` table, and
cron-first data flow are all exactly what `docs/PROJECT_REFERENCE.md`
specified up front, and the code has actually stayed honest to that plan
(zero `any` usage found anywhere in the repo; every widget follows an
identical file layout; every widget's cache/settings/refresh path shares
the same generic shell code). This is a genuinely strong foundation.

**The one place the architecture has quietly drifted from its own stated
principle** ("the dashboard shell should know nothing about widget-specific
logic") **is `apps/web/src/app/page.tsx`'s `WidgetGrid` and the
`CUSTOM_ACTIONS` map** — both hardcode specific widget IDs into the shell.
This is the architecture's single largest scalability risk: it works fine
at 8 widgets and becomes actively painful, then unworkable, well before 50.
Everything else in the codebase — the SDK, the adapters, the database
layer, the widget package shape — scales close to linearly. Fix the grid
placement and action-wiring pattern, and this architecture genuinely can
carry 50+ widgets. Leave it as-is, and `page.tsx` becomes the bottleneck
every new widget has to fight.

---

## Folder structure & monorepo organization

### Assessment: strong, matches the documented plan almost exactly

- **Files:** `pnpm-workspace.yaml`, `turbo.json`, `docs/ARCHITECTURE.md`'s "Monorepo layout" section
- **What's there:** `apps/web` (shell), `packages/ui` (design system), `packages/sdk` (widget contract), `packages/auth`, `packages/database`, `packages/widgets/*` (one per widget), `packages/adapters/*` (one per external service). This is exactly the structure `docs/PROJECT_REFERENCE.md` §5 laid out before any code was written, and it's held.
- **Turborepo config** (`turbo.json`) correctly expresses the dependency graph (`dependsOn: ["^build"]`) so `pnpm build`/`lint`/`typecheck`/`test` all respect package boundaries — a widget package's typecheck depends on its adapter's build, etc. This is the right call for the stated concern in `docs/PROJECT_REFERENCE.md` §20 ("Monorepo adds real tooling overhead... a deliberate trade").
- **Minor inconsistency:** `pnpm-workspace.yaml` lists `packages/*`, `packages/widgets/*`, and `packages/adapters/*` as separate globs (pnpm doesn't recurse automatically, correctly documented in `ARCHITECTURE.md:36-38`). This is fine at today's scale but is itself a small tax that grows with widget count only in the sense that every new *category* of package (not each widget) needs its own workspace glob — not a real scalability concern, just worth knowing it's there.
- **No structural finding here rises above Low severity.** This part of the architecture is sound.

---

## Widget system

### WS1 — Critical: the dashboard shell hardcodes specific widget IDs into its layout and action-wiring, contradicting the architecture's own core rule

- **File:** `apps/web/src/app/page.tsx:32-48` (CUSTOM_ACTIONS), `apps/web/src/app/page.tsx:197-290` (WidgetGrid)
- **Code — action wiring:**
  ```ts
  const CUSTOM_ACTIONS: Record<string, Record<string, WidgetAction>> = {
    [HERO_WIDGET_ID]: { cycleQuote: cycleHeroQuoteAction },
    [TASKS_WIDGET_ID]: { addTask: addTaskAction, toggleTask: toggleTaskAction, deleteTask: deleteTaskAction },
    [NOTES_WIDGET_ID]: { addNote: addNoteAction, updateNote: updateNoteAction, deleteNote: deleteNoteAction },
    [NOTEBOOK_WIDGET_ID]: { addEntry: addEntryAction, updateEntry: updateEntryAction },
  };
  ```
  **Code — grid placement:**
  ```ts
  const tasksWidget = nonHeroWidgets.find((widget) => widget.id === TASKS_WIDGET_ID);
  const notesWidget = nonHeroWidgets.find((widget) => widget.id === NOTES_WIDGET_ID);
  const notebookWidget = nonHeroWidgets.find((widget) => widget.id === NOTEBOOK_WIDGET_ID);
  const githubWidget = nonHeroWidgets.find((widget) => widget.id === GITHUB_WIDGET_ID);
  const steamWidget = nonHeroWidgets.find((widget) => widget.id === STEAM_WIDGET_ID);
  const rssWidget = nonHeroWidgets.find((widget) => widget.id === RSS_WIDGET_ID);
  ```
- **Why this matters:** `docs/PROJECT_REFERENCE.md` §1 states the core philosophy in one sentence: *"the app shell knows nothing about calendars or GitHub or Spotify."* §6 restates it: *"The shell should never contain widget-specific business logic."* Both of these blocks are exactly that — `page.tsx` imports every individual widget's ID constant and branches on it, twice, in two different ways (one for actions, one for layout). Every one of `apps/web/src/app/page.tsx:6-12`'s imports is a widget-specific import into the shell:
  ```ts
  import { WIDGET_ID as GITHUB_WIDGET_ID } from "@pulse/widget-github";
  import { HERO_WIDGET_ID } from "@pulse/widget-hero";
  import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
  import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
  import { WIDGET_ID as RSS_WIDGET_ID } from "@pulse/widget-rss";
  import { WIDGET_ID as STEAM_WIDGET_ID } from "@pulse/widget-steam";
  import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";
  ```
- **Does this actually break "add a widget = add a file"?** Partially. `docs/ARCHITECTURE.md`'s own "Adding a widget" steps (1-6) are honest about this: step 3 says register in `register-widgets.ts`, but nothing in that doc claims layout placement or custom actions are automatic — a new widget without special actions and without a hardcoded grid slot just falls through to... nowhere, actually (see WS2 below). The generic case (a plain `WidgetCard` widget with only refresh/settings) *does* work without touching `page.tsx`, because `getAllWidgets()` returns every registered widget and `WidgetSlot`/`WidgetCell` render any of them generically. The hardcoding only bites for (a) placement in the deliberately hand-arranged bento grid, and (b) any widget that needs an action beyond refresh/settings.
- **Impact at 50+ widgets:** This is where the real problem shows up. `WidgetGrid`'s current layout is a fully bespoke, hand-placed arrangement (explicit rows, explicit column spans, explicit widget-to-slot assignment) — that's a deliberate, documented design choice for *today's* 7-widget dashboard (an art-directed bento grid, not an auto-flowing one, matching `docs/DESIGN_SYSTEM.md`'s "considered page" philosophy). But nothing about that placement strategy generalizes past a small, fixed, known set of widgets. At 50 widgets, either:
  1. `WidgetGrid` grows to 50 explicit `find()` calls and an increasingly complex hand-tuned grid (a maintenance burden that scales linearly with widget count, directly contradicting §13's "keep the dashboard shell generic"), or
  2. Most widgets fall back to some generic auto-placement path that doesn't exist yet (see WS2).
  Similarly, `CUSTOM_ACTIONS` growing to 50 entries means every widget with any interactive affordance beyond refresh/settings requires a shell-level edit, which is exactly the coupling the SDK was built to avoid.
- **Recommended direction:** Two separable problems, two separable fixes:
  1. **Actions:** `CUSTOM_ACTIONS` could be replaced by having each widget declare its own extra actions as part of its `Widget` object (the SDK already has the shape — `TActions extends WidgetActions` is a generic already threaded through `Widget<TData, TSettings, TActions>` in `packages/sdk/src/widget.ts`). A widget's own `widget.ts` could export the action map alongside `registerWidget()`, and `WidgetSlot` could read `widget.actions` (built by the widget module itself, closing over the shell's auth/db primitives it's handed) instead of the shell maintaining a side-table keyed by every widget ID it knows about.
  2. **Layout:** decide, deliberately, whether the bento grid stays hand-curated forever (in which case it should be explicitly scoped to "the ~8 widgets someone actually looks at daily," with everything else auto-flowing below it in registration order — see WS2), or whether a generic auto-flow grid (ordered by a `priority`/`order` field on `Widget`, or just registration order) becomes the default and hand-placement becomes the exception for a small curated set. Both are legitimate; what doesn't scale is the current all-hardcoded approach as the *only* mechanism.

### WS2 — High: there is no path for a newly registered widget to appear on the dashboard at all, unless it's manually added to `WidgetGrid`

- **File:** `apps/web/src/app/page.tsx:209-290`
- **What's happening:** `WidgetGrid` computes `heroWidgets` and `nonHeroWidgets` from `getAllWidgets()` (generic, correct), but then only ever renders the six specifically-named widgets pulled out via `.find()` — `tasksWidget`, `notesWidget`, `notebookWidget`, `githubWidget`, `steamWidget`, `rssWidget` — plus the two static "Coming soon" cards. **A widget registered via `registerWidget()` that isn't one of those six IDs is fetched, cached, and refreshed by the cron job — but never rendered anywhere on the dashboard.** (Spotify is exactly this today, per the code comment at `page.tsx:193-195`: *"Spotify is intentionally not looked up/rendered here... It stays registered... but no longer appears on the dashboard."* That's currently an intentional, documented exception for one widget — but it's also the accidental behavior for any widget the grid doesn't know to look for.)
- **Why it matters:** This means `docs/ARCHITECTURE.md`'s own "Adding a widget" checklist (steps 1-4: create the package, add an adapter if needed, register it, add it to `apps/web/package.json`) is **incomplete** — it doesn't mention that step 3 alone won't make a new widget *visible*. A step 5 ("...and add it to `WidgetGrid`'s layout") is missing from the documented process and from the code's own generic path.
- **Recommended direction:** Add a fallback: any registered non-hero widget not explicitly placed in the curated rows should auto-flow into a generic section of the grid (in registration order, or by a `priority` field), so "registered" and "visible" can't silently diverge. This directly resolves the "does this scale to 50+" question for anything beyond the hand-curated top widgets.

### WS3 — Medium: `getAllWidgets()` returns an unordered `Map` iteration with no stable, declared ordering

- **File:** `packages/sdk/src/registry.ts:5, 39-41`
- **Code:** `const registry = new Map<string, Widget>(); ... export function getAllWidgets(): Widget[] { return Array.from(registry.values()); }`
- **Why it matters:** `Map` iteration order in JS is insertion order, so this is *currently* deterministic (matches `register-widgets.ts`'s import order) — but nothing in the `Widget` interface declares an explicit ordering/priority field, so the dashboard's widget order is an accidental side effect of import statement order in one file, not a first-class, intentional property of each widget. At 50 widgets, "reorder the dashboard" means "reorder unrelated import statements in `register-widgets.ts`," which is fragile and non-obvious to a future contributor (or to the WS2 fix above, which would need *some* ordering signal to auto-flow widgets sensibly).
- **Recommended direction:** Add an explicit `order`/`priority` field to the `Widget` interface (optional, defaulting to registration order) so layout ordering is a declared property of each widget module, not an emergent property of import order.

### WS4 — Low: `registerWidget`'s re-registration guard only protects against literal object identity, not against duplicate IDs across differently-versioned modules

- **File:** `packages/sdk/src/registry.ts:16-29`
- **Code:** `if (existing) { if (existing === widget) return; throw new Error(...); }`
- **Why it matters:** This correctly handles HMR re-evaluation (the documented intent), and correctly throws on a genuine ID collision between two different widget objects. Flagged only as a note for scale: with 50 widget packages authored potentially by different contributors (if Pulse ever reaches `docs/PROJECT_REFERENCE.md` §4's Phase 4 "publish" scenario), ID collisions become a real coordination cost with no registry-side namespacing (e.g. no enforced `@pulse/widget-<name>` ↔ `id` convention checked at registration time beyond "does the string collide").
- **Recommended direction:** Not urgent at solo-project scale. If multi-author widgets ever become real (Phase 4), consider namespacing widget IDs by package name automatically rather than trusting each widget author to pick a globally-unique string.

---

## Code duplication

### CD1 — Medium: every write-action file (`notes.ts`, `tasks.ts`, `notebook.ts`, `hero.ts`) repeats the same four-step shape by hand

- **Files:** `apps/web/src/app/actions/notes.ts`, `tasks.ts`, `notebook.ts` (and to a lesser extent `hero.ts`)
- **What's happening:** Every action in every one of these files repeats, near-verbatim:
  ```ts
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in" };
  // ...parse formData, validate...
  try {
    await someDbWrite(...);
    await refreshWidget(WIDGET_ID, session.user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to ..." };
  }
  revalidatePath("/");
  revalidatePath("/notes"); // or /tasks, /notebook
  return {};
  ```
  This exact shape appears **9 times** across `notes.ts` (3 actions) + `tasks.ts` (3 actions) + `notebook.ts`'s equivalent actions, each hand-written rather than sharing a helper. The code itself is self-aware of this — `notes.ts:12-13`'s comment literally says *"Same shape as actions/tasks.ts"*, and `tasks.ts:9-14`'s comment says *"All three actions follow `updateWidgetSettingsAction`'s shape."*
- **Why it matters:** This is exactly the kind of "three similar lines" `CLAUDE.md`'s own code style section says is fine *until* it's not — and at 3 widgets with 3 actions each, it arguably still is. But this pattern (auth-check → try/write/refresh → catch/format-error → revalidate) is the literal template every future interactive widget's write actions will copy-paste again. At 50 widgets, if even a third have their own write actions (tasks/notes/notebook-style CRUD, not just read+refresh), this is 100+ near-identical hand-copies of the same five-line skeleton, each a place a future edit (e.g. "always revalidate `/timeline` too, since memories changed") has to be remembered and applied N times instead of once.
- **Recommended direction:** Extract a small helper — e.g. `runWidgetWriteAction(widgetId, revalidatePaths, fn)` that wraps the auth check, try/catch/error-formatting, `refreshWidget` call, and `revalidatePath` calls — and have each action call it with just its own validation + DB write. This is a pure refactor (no behavior change) that would cut ~60% of the code in these three files and make the pattern a single source of truth instead of a convention enforced only by comments pointing at each other.

### CD2 — Low: widget package boilerplate (`package.json`, `constants.ts`, `index.ts`) is copy-pasted per widget with no generator/template

- **Files:** every `packages/widgets/*/package.json` (near-identical `scripts`/`devDependencies` blocks — compare `steam/package.json` and `rss/package.json`, which differ only in `name` and the one adapter dependency)
- **Why it matters:** `docs/ARCHITECTURE.md:150-151` already documents the intended process as "use `packages/widgets/steam` as the template" — i.e. this is a known, accepted manual-copy workflow, not an oversight. At today's 8-widget scale this is a minor, occasional cost. At 50 widgets, hand-copying a `package.json` (with its exact `devDependencies` versions) 40+ more times is a real source of drift — a version bump to `vitest`/`typescript` in one new widget and not back-applied to the template, or a forgotten `peerDependencies` block, compounds slowly across every future package.
- **Recommended direction:** A small `pnpm create`-style scaffolding script (or even a checked-in template directory copied by a one-line script) would remove this as a manual, error-prone step once widget count climbs past what one person copy-pastes carefully.

### CD3 — Low: `derive-memories.ts` exists in 5 of 8 widget packages with no shared scaffolding beyond the `MemoryEvent` type

- **Files:** `packages/widgets/{github,notes,spotify,steam,tasks}/src/derive-memories.ts`
- **Why it matters:** Each widget's `deriveMemories` independently implements "diff previous cached data against new data, emit `MemoryEvent[]`" — reasonable, since what counts as a memory-worthy change is genuinely widget-specific (a new GitHub streak vs. a completed task vs. a new note are different shapes of "change"). Not clearly over-duplicated, but worth a periodic check: if 3+ of these end up sharing an actual comparison idiom (e.g. "did a specific field change from falsy to truthy"), that's worth promoting to a shared helper in `packages/sdk`.
- **Recommended direction:** No action needed now; a "diff-derived memory" helper is worth revisiting only if a real duplicate pattern (not just a duplicate *concept*) emerges across a few more widgets.

---

## Type safety

### Assessment: excellent — this is the strongest part of the codebase

- **Zero `any`/`as any`/`<any>` usage found anywhere** in `packages/` or `apps/` (excluding test files, which were not grepped but weren't the audit's concern). For a TypeScript codebase of this size, that's a genuinely rare and valuable property — it means every widget's `TData`/`TSettings` generics are real, checked types, not escape hatches.
- **`Widget<TData, TSettings, TActions>`'s generics** (`packages/sdk/src/widget.ts:80-118`) correctly thread through `WidgetRenderProps` and the registry, with an honestly-documented, deliberate type-erasure point (`registry.ts:31-34`'s comment explains exactly why `widget as unknown as Widget` is the one necessary cast, and why it's safe — each widget's own `render()` re-attaches its real types at the call site).
- **Runtime validation backs the compile-time types**: `dataSchema` (a Zod schema, optional per-widget) lets `readWidgetCache` (`packages/database/src/widget-cache.ts:33-42`) catch a cache row that no longer matches its widget's current shape at the boundary, rather than trusting a stale cast — a real, working defense against the classic "the type says X but the DB has stale Y" bug class.
- **TF1 — Low:** `dataSchema` is optional, and per the widget-cache doc comment, *"Without it, this falls back to the previous behavior — a compile-time-only cast, no runtime check."* Worth checking how many of the 8 current widgets actually supply `dataSchema` vs. how many still rely on the unchecked fallback — if it's inconsistent, that's a quiet type-safety gap masked by otherwise-strong typing elsewhere. (Not verified widget-by-widget in this pass; flagged as a quick audit worth doing directly.)
- **Recommended direction:** Keep doing exactly what's being done. If anything, consider making `dataSchema` non-optional on the `Widget` interface once every current widget has one — turning "runtime-checked cache" from a convention into a compile-time-enforced contract.

---

## API abstraction (adapter layer)

### Assessment: matches the documented design, clean separation

- **Files:** `packages/adapters/{github,rss,spotify,steam,weather}/src/*`
- Every adapter owns exactly what `docs/ARCHITECTURE.md:82-84` and `docs/PROJECT_REFERENCE.md`'s "Adapter layer" section specify: the HTTP call, auth, and response normalization, with widgets consuming only normalized data via each widget's own `fetch.ts`. No widget was found calling `fetch()` directly against an external API — confirmed by the consistent `fetch.ts` file present in every widget package, which is the documented single point where a widget talks to its adapter.
- **AB1 — Low:** Adapter package sizes are uneven (`spotify` has 4 files including OAuth token exchange; `steam`/`weather` have just a `client.ts` + `index.ts`). This is appropriate to each service's actual complexity, not a structural problem — flagged only to note that "one adapter per service" doesn't mean "one file per service," and that's fine.
- **AB2 — Medium:** No shared HTTP/retry/timeout helper across adapters. `apps/web/src/lib/refresh-widget.ts:42` applies a single `AbortSignal.timeout(FETCH_TIMEOUT_MS)` at the `fetchData()` call boundary (good, generic, shell-owned), but within each adapter's own `client.ts`, retry/backoff behavior (if any) is presumably adapter-specific and not reviewed file-by-file in this pass. At 50 widgets potentially spanning 20-30 distinct external services, a shared `fetchJson(url, options)` helper in `packages/adapters` (or a new small `packages/http` package) handling consistent error normalization, timeout propagation, and response-shape validation would prevent 20-30 independent reinventions of the same "call an API and handle failure" logic.
- **Recommended direction:** Worth a follow-up pass reading each `client.ts` to confirm whether error handling/timeout/retry logic is actually duplicated across adapters (this audit didn't read every adapter client file line-by-line); if so, extract a shared fetch helper before the adapter count grows much further.

---

## Component abstraction

### Assessment: strong, well-enforced by convention and by the design system doc

- **Files:** `packages/ui/src/{widget-card,widget-menu,action-form,skeleton,empty-state,error-state,modal,widget-error-boundary}.tsx`
- Every widget renders through `WidgetCard`, and every widget's actions (Refresh, Settings) render through the shared `WidgetMenu`/`ActionForm` — confirmed by grepping every widget's `component.tsx`, which consistently imports these rather than hand-rolling card chrome. This is the "component abstraction" half of `CLAUDE.md`'s widget standards actually holding up in the code, not just documented.
- **CA1 — Low:** `WidgetCard`'s `compact` prop (`packages/ui/src/widget-card.tsx:27-30`) is a boolean toggle between two hardcoded padding/gap presets, used by exactly 3 widgets (Tasks/Notes/Notebook). This is a reasonable minimal API today; if a third or fourth density variant becomes necessary as more widget *types* emerge (e.g. a dense list-widget vs. a sparse stat-widget vs. today's two), consider whether `compact: boolean` should become a `density: "compact" | "regular" | ...` enum before a third boolean flag gets bolted on next to it.
- **No finding here rises above Low.** This is a well-executed shared-component layer.

---

## Custom hooks

### Assessment: sparse but clean — no evidence of hook misuse or duplicated hook logic

- **Files:** `packages/ui/src/use-dismissable-menu.ts`, `packages/ui/src/use-pull-to-refresh.ts`, `packages/widgets/github/src/use-day-popover.ts`
- Only 3 custom hooks exist in the entire codebase. `useDismissableMenu` is correctly shared between `WidgetMenu` and `ProfileMenu` (its own doc comment notes it replaced hand-rolled duplicate logic in both — a good example of the right abstraction happening at the right time, not preemptively). `use-day-popover` is GitHub-widget-specific and appropriately not shared, since nothing else in the app has an equivalent interaction.
- **CH1 — Low:** `RefreshAllTitle` (`apps/web/src/app/refresh-all-title.tsx:53-95`) hand-rolls a fair amount of ref/effect bookkeeping (`lastRefreshRef`, `isPendingRef`, a `visibilitychange`/`focus` auto-refresh listener) inline in the component rather than as a extractable `useAutoRefresh(...)` hook. Not wrong at one call site, but if a second widget ever wants the same "auto-refresh when the tab regains focus, throttled" behavior, this logic should move to a shared hook rather than being copied.
- **Recommended direction:** No action needed today — flagged as a "watch for a second use case" item, not a current defect.

---

## Server actions

### Assessment: consistent, correctly-scoped, but see CD1 (duplication) and the performance audit's C1/C3/C4 for the shared cross-cutting issues

- **Files:** `apps/web/src/app/actions/*.ts`
- Every server action correctly starts with its own `auth()` check rather than trusting a shared session already validated elsewhere (defensive, appropriate for Server Actions which can be invoked independently of any particular page render). Every action returns the shared `WidgetActionState` shape (`{ error?, quote?, entryId? }`) consistently.
- **SA1 — Medium:** `WidgetActionState` (`packages/sdk/src/widget.ts:21-32`) already has widget-specific optional fields bolted directly onto the shared shell type — `quote` (Hero-only) and `entryId` (Notebook-only), each with a comment explaining which widget uses it. This is the same shape of coupling as WS1 (widget-specific concerns leaking into shared shell types), just smaller in scope. At 50 widgets, if even a handful need to return widget-specific data from their actions (which `quote`/`entryId` demonstrate is a real, recurring need — not hypothetical), `WidgetActionState` either keeps growing one optional field per widget forever, or needs a generic `TResult` slot (`WidgetActionState<TResult = void>` with a typed `result?: TResult` field) that each widget's own actions populate without the shared type needing to know their names.
- **Recommended direction:** Generify `WidgetActionState` with an optional typed payload slot now, while only two widgets need it, rather than after the pattern has been copied a dozen more times.

---

## Auth

### Assessment: correctly layered (Auth.js owns identity, Supabase is storage-only), but see the performance audit for the session-strategy cost

- **Files:** `packages/auth/src/config.ts`, `apps/web/src/auth.ts`
- The single-user gate (`signIn` callback rejecting any GitHub login but the configured owner, `config.ts:31-36`) is a clean, minimal, correctly-placed piece of business logic — it lives in the auth config, not scattered across routes.
- **This audit does not re-litigate `session: { strategy: "database" }`** — that's `PERFORMANCE_AUDIT.md`'s C1 finding (every `auth()` call is a DB round trip) and is a *performance* issue, not an architectural one; the architectural placement of the session strategy (in `packages/auth`, one line, easy to change) is actually a point in this architecture's favor — fixing C1 is a one-line, low-risk change specifically *because* the auth config is well-isolated.
- **AU1 — Low:** `session.user.id` is set via a `session()` callback reading `user.id` (`config.ts:37-40`) — correct for the database strategy. If/when the performance audit's JWT recommendation is adopted, this callback will need a paired `jwt()` callback to carry `user.id` into the token; flagging only so that fix isn't scoped as "just flip the strategy string," which would silently break `session.user.id` everywhere it's read (every server action, every page).
- **No structural finding here rises above Low.** Auth is well-isolated and easy to evolve.

---

## Supabase

### Assessment: schema design directly enables the "add a widget = no migration" goal; a few consistency gaps in the client layer

- **Files:** `packages/database/src/*.ts`, `supabase/migrations/*`
- **The core design decision — one generic `widget_cache` table keyed by `(user_id, widget_id)` with a JSON blob, instead of a table per widget** (`docs/ARCHITECTURE.md:181-182`, `docs/PROJECT_REFERENCE.md` §8) — is exactly right for 50+ widget scalability. This is the single most important schema decision for the stated goal, and it's already made correctly. Widget count can grow without a single additional migration for cache/settings storage.
- **DB1 — Medium:** `createServiceClient()` (`packages/database/src/client.ts:7-20`) is called fresh, uninstantiated, in *every* database function — `readWidgetCache`, `writeWidgetCache`, `readWidgetSettings`, `writeWidgetSettings`, `ensureWidgetRegistered`, etc. all independently call `createServiceClient()` rather than sharing one memoized instance per request. (Also flagged from a pure latency angle in `PERFORMANCE_AUDIT.md`'s H2.) Architecturally, this means there's no single place that owns "the app's Supabase client for this request" — every call site re-derives it from `process.env` independently. At 50 widgets each potentially calling 2-4 database functions per render/action, that's 100-200+ independent client constructions per request cycle with no shared instance, connection reuse, or request-scoped caching.
- **DB2 — Low:** No batch/bulk read helpers exist for "read every registered widget's cache for this user" — each widget's cache is read one at a time (`readWidgetCache(userId, widgetId)`), called once per widget from `page.tsx`'s `WidgetSlot` (also flagged in `PERFORMANCE_AUDIT.md`'s H1). Architecturally, `packages/database` has no `readAllWidgetCache(userId, widgetIds[])` shape at all — every consumer is structurally locked into N sequential/parallel single-row queries rather than one batched query, because the abstraction was never built. This is worth fixing before 50 widgets not just for latency (already covered elsewhere) but because it's the kind of missing abstraction that gets *harder* to retrofit the more call sites accumulate around the current one-row-at-a-time shape.
- **Recommended direction:** (1) Wrap `createServiceClient` in React's `cache()` for request-scoped reuse (same fix as the performance audit's H2, but noted here as an architectural gap, not just a latency one — there should be one canonical "the request's Supabase client," not N independent constructions). (2) Add batch read helpers (`readAllWidgetCache`, `readAllWidgetSettings`) to `packages/database` now, while only ~7 call sites would need to migrate to them, rather than after 50 widgets' worth of individual `WidgetSlot`-style code depends on the one-at-a-time shape.

---

## Environment variables

### Assessment: well-documented, correctly scoped, but manually synchronized across three separate places with no enforcement

- **Files:** `.env.example`, `turbo.json:7-19` (`build.env` array), `packages/auth/src/config.ts`, various `process.env.*` reads across adapters
- `.env.example` is genuinely well-commented — every variable explains what it's for and links to where to obtain it (e.g. `STEAM_API_KEY`'s comment pointing at `steamcommunity.com/dev/apikey`). `CLAUDE.md`'s own ground rules explicitly call out keeping `turbo.json`'s `build.env` and `.env.example` in sync as "a real trap" — meaning this is a known, actively-managed risk, not an unrecognized one.
- **EV1 — Medium:** There is no single source of truth for "what env vars does Pulse need" — it's tracked by hand in (at least) three places: `.env.example` (documentation), `turbo.json`'s `build.env` array (Turborepo's strict-env allowlist), and each adapter/widget's own `process.env.X` reads (the actual usage). Nothing validates at build or startup time that these three lists agree with each other. At 50 widgets, if even a third bring their own API key (a very plausible ratio, given today's ratio is roughly 1 key-requiring var per external-service widget), that's 15-20+ more env vars to keep synchronized by hand across three unenforced lists — a realistic source of "works locally, breaks in CI/prod because `turbo.json` wasn't updated" bugs, which is exactly the failure mode `CLAUDE.md` already warns about for the *current*, much smaller variable count.
- **Recommended direction:** Consider a small typed env-schema module (e.g. a Zod schema in `packages/database` or a new tiny `packages/env` package) that every adapter/widget reads through instead of raw `process.env.X` — this gives one place that fails loudly (at import time) if a variable is missing, and could double as the generator for `.env.example`'s contents, closing the three-way sync gap structurally instead of by discipline alone.

---

## Shared utilities

### Assessment: appropriately thin — no premature utils dump, but no home for genuinely cross-cutting logic either

- **Files:** `apps/web/src/lib/*.ts` (`group-memories.ts`, `memory-sources.tsx`, `refresh-widget.ts`, `register-widgets.ts`)
- There's no `packages/shared` or `packages/utils` package despite `docs/PROJECT_REFERENCE.md`'s original §5 folder sketch listing both — and their absence is *correct*, not a gap: nothing in the current codebase needs a generic dumping-ground package, and `CLAUDE.md`'s "no premature abstractions" principle explicitly favors this. The few genuinely shared concerns (widget cache/settings I/O, the refresh orchestration in `refresh-widget.ts`) already live in the right place (`packages/database`, `apps/web/src/lib`).
- **SU1 — Low:** `apps/web/src/lib/refresh-widget.ts` (the scheduler/manual-refresh shared code path) lives in `apps/web`, not in a package — meaning it's only reachable by the Next.js app, not by, say, a future standalone script or a different app entry point (`apps/desktop`, mentioned as a real future target in `docs/PROJECT_REFERENCE.md` §3/§5's Tauri plan). This is fine today (there's only one app), but worth flagging: if `apps/desktop` (a Tauri wrapper) is ever added per the original plan, `refresh-widget.ts`'s current home in `apps/web/src/lib` rather than a shared package would need to move at that point, not before.
- **Recommended direction:** No action needed now — correctly deferred. Revisit only when/if a second app consumer actually appears.

---

## Testing readiness

### Assessment: real, meaningful coverage on pure logic; near-zero coverage on the integration seams that matter most for 50-widget scale

- **Files:** 42 test files found across the repo (`find . -name "*.test.ts*"`)
- **What's well-tested:** Pure/derived logic — `derive-memories.test.ts` (5 widgets), `types.test.ts` (Zod schema validation, 6 widgets), format helpers, `heatmap-layout.test.ts`, `streaks.test.ts`, `pick-quote.test.ts`, `weather-tip.test.ts`. This is exactly the right thing to unit-test — deterministic, pure functions with clear inputs/outputs — and it's done consistently per-widget, not just for a couple of "important" ones.
- **TR1 — High: no integration/contract test exists for the SDK boundary itself.** There is no test that registers a fake/minimal `Widget`, renders it through the real `WidgetSlot`/`WidgetCard`/`WidgetMenu` pipeline, and asserts the shell handles it correctly — i.e. nothing tests the actual contract `docs/PROJECT_REFERENCE.md` calls the architecture's central promise ("the shell only knows the `Widget` interface"). Every individual widget's own logic is tested; the thing that makes this a *platform* rather than 8 independent features — the SDK contract itself — has no test coverage. At 50 widgets, this is the highest-leverage gap: a change to `WidgetSlot`, `registerWidget`, or the `Widget` interface's shape currently has no automated signal for "did this break every widget that depends on this contract," only "did this break the one or two widgets whose own tests happen to exercise the render path."
- **TR2 — Medium: `apps/web/src/app/page.tsx`'s `WidgetGrid` (the actual dashboard layout logic) has no test coverage found.** Given WS1/WS2 above identify this as the least generic, most hand-maintained part of the whole system, it's also completely untested — there's no test asserting "every registered widget appears somewhere in the grid" (which, per WS2, is currently *false* for non-curated widgets — a test would have caught/documented this directly).
- **TR3 — Low:** E2e coverage (`pnpm --filter @pulse/web test:e2e`, per `CLAUDE.md`) is explicitly scoped to signed-out pages only (`apps/web/playwright.config.ts`'s documented reason, not reviewed line-by-line in this pass) — meaning the actual authenticated dashboard experience (the whole product) has zero end-to-end coverage. This is a reasonable, explicitly-acknowledged trade-off for a single-user personal app without a test account strategy, not an oversight — flagged for completeness, not as a defect.
- **Recommended direction:** Before scaling widget count meaningfully, add (a) one integration test that registers a minimal fake widget and asserts it renders correctly through the real shell pipeline (catches SDK contract regressions widget-by-widget tests can't), and (b) one test on `WidgetGrid` asserting every widget returned by `getAllWidgets()` is actually rendered somewhere (this test would fail today because of WS2 — writing it first would make that gap an explicit, tracked decision rather than a silent one).

---

## Future scalability: can this architecture comfortably support 50+ widgets?

**Short answer: the data/adapter/SDK layers, yes, comfortably. The dashboard shell's layout and action-wiring, no — not without the WS1/WS2 fix.**

Breaking it down by layer:

| Layer | Scales to 50+? | Why |
|---|---|---|
| Widget package structure (`packages/widgets/*`) | **Yes** | Fully self-contained per widget, consistent file shape, no shell coupling required for the basic case |
| Adapter layer (`packages/adapters/*`) | **Yes** | One package per service, no shared-state coupling; AB2's shared-fetch-helper gap is a nice-to-have, not a blocker |
| Widget registry (`packages/sdk`) | **Mostly** | `Map`-based, O(1) lookup, fine at 50 — WS3's missing ordering field is the only real gap |
| Database/cache layer (`packages/database`) | **Yes, schema-wise; needs DB1/DB2 fixes for efficiency** | The one-generic-table design is exactly right; the per-call-site client construction and lack of batch reads are efficiency problems, not scalability *ceilings* — they'll work at 50 widgets, just wastefully |
| Cron/scheduler (`apps/web/src/app/api/cron/route.ts`) | **Needs attention** | `Promise.allSettled(userIds.flatMap(...widgets.map(refreshWidget)))` (`route.ts:37-39`) fires **every widget's `fetchData()` for every user, fully concurrently, with no batching/concurrency cap.** At today's scale (1 user × 8 widgets = 8 concurrent calls) this is fine. At 50 widgets (even still 1 user = 50 concurrent external API calls fired simultaneously, each with its own 10s timeout), this risks tripping rate limits on shared adapters, exhausting outbound connection limits, or hitting the hosting platform's function concurrency/memory ceiling — this needs a concurrency limit (e.g. batches of 5-10) before 50 widgets, not after. |
| Dashboard layout (`apps/web/src/app/page.tsx`'s `WidgetGrid`) | **No — this is the real ceiling** | See WS1/WS2. This is hand-curated placement logic that requires an editor to touch `page.tsx` for every widget that needs a specific spot, with no generic fallback for the rest. |
| Action wiring (`CUSTOM_ACTIONS`) | **No, same root cause as above** | Every widget with a custom action beyond refresh/settings requires a shell-level edit |
| Type safety | **Yes** | Generic, well-erased, zero `any` — nothing here degrades with widget count |
| Testing | **Needs the TR1 gap closed first** | Per-widget tests scale fine (each widget tests itself); the missing SDK-contract test becomes more valuable, not less, as more widgets depend on that contract staying stable |

**Bottom line:** the parts of this architecture that were explicitly designed against the "50+ widgets" requirement from day one (`docs/PROJECT_REFERENCE.md` §10: *"Architecture (widget SDK) already supports all of these without shell changes — the discipline is sequencing, not capability"*) have genuinely held up that promise — for data, fetching, and typing. The one place that claim is currently **false** is the dashboard's own layout/action code, which wasn't part of the original SDK design and has organically grown into exactly the kind of shell-side, widget-specific coupling the rest of the architecture was built to avoid. This is very fixable (WS1/WS2's recommended direction is a bounded, well-scoped change, not a rewrite) — but it should happen deliberately, before the widget count grows much past what today's hand-curated grid can reasonably keep hardcoding.

---

## Priority summary

In order of impact toward genuinely supporting 50+ widgets:

1. **WS1/WS2** — the dashboard grid's hardcoded widget lookups and the missing auto-flow fallback are the actual scalability ceiling. Fix the layout/action-wiring pattern before widget count climbs much further.
2. **Cron concurrency** (scalability table, cron row) — add a concurrency cap to the scheduler before firing 50 simultaneous external API calls per refresh cycle.
3. **TR1** — an SDK-contract integration test is the highest-leverage testing gap; it protects the exact promise ("shell knows nothing about widget specifics") the whole architecture is built around.
4. **DB1/DB2** — request-scoped Supabase client + batch cache/settings reads, both flagged from a pure architecture-cleanliness angle here (efficiency, not correctness) and from a latency angle in `PERFORMANCE_AUDIT.md`.
5. **CD1** — extract the write-action boilerplate now, while it's 3 files, not 30.
6. **EV1** — a typed env schema before the variable count triples.

Everything else in this document (adapter shared-fetch-helper, widget package scaffolding, `WidgetActionState` generification) is real but lower-urgency — worth doing, but none of them are what stands between Pulse and a comfortable 50-widget dashboard the way the layout/action-wiring pattern is.
