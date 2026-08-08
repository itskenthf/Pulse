# Pulse Performance Audit

Date: 2026-08-08
Scope: full-stack audit (Next.js App Router, React rendering, Supabase, caching, bundle, fonts, animation) with a focus on the reported symptom — **a small delay before every click's navigation or interaction completes.**

This document only reports findings. Nothing has been changed.

## Executive summary — root cause of "every click has a delay"

Two structural decisions account for almost all of the perceived click lag, and they compound:

1. **Auth.js is configured with `session: { strategy: "database" }`** (`packages/auth/src/config.ts:20-22`). Every single `auth()` call — and it's called on *every* page render and *every* server action — does a live Postgres round-trip through the Supabase adapter to validate the session token. There is no JWT fast path. This one line means "click a link" and "click refresh" both pay a database query before anything else happens.
2. **There is no `loading.tsx` anywhere in `apps/web/src/app`**, and every route's Server Component `await`s `auth()` (a DB call) before returning *any* JSX — including the `<Navbar>` shell that doesn't need the session lookup to render its static parts. Combined with (1), navigating to `/timeline`, `/tasks`, `/notes`, or `/notebook` shows nothing — not even a skeleton — until that DB round trip (plus the page's own data query) resolves. Next.js has no instant loading state to fall back to because none was ever added.

On top of that, the dashboard's own "Refresh" actions (`refreshWidgetAction`, `refreshAllWidgetsAction`) synchronously `await` live third-party API calls (GitHub, Steam, RSS, weather — up to a 10s timeout) *before* returning control to the UI, and then call `revalidatePath("/")`, which forces the entire widget grid (every widget's cache + settings, two Supabase queries each) to re-fetch, not just the one widget that changed.

None of this is a single bug — it's an architecture that puts a network round trip (often several, serialized) between a click and the next pixel, on a page that's supposed to feel instant. The fixes below are ordered by how much of that latency they remove.

---

## Critical

### C1. Database session strategy puts a Postgres round-trip on every click

- **File:** `packages/auth/src/config.ts:20-22`
- **Code:**
  ```ts
  session: {
    strategy: "database",
  },
  ```
- **Why it happens:** With the database strategy, Auth.js's `auth()` doesn't just verify a signed cookie — it looks up the session row (and joins to the user) via `SupabaseAdapter` on every call. `auth()` is called in:
  - `apps/web/src/app/page.tsx:51` (every dashboard load)
  - `apps/web/src/app/timeline/page.tsx:86`, `tasks/page.tsx`, `notes/page.tsx`, `notebook/page.tsx`, `steam/[appId]/page.tsx` (every navigation)
  - `apps/web/src/app/actions/widgets.ts:16,41,76` (every refresh / settings save)
  - `apps/web/src/app/actions/hero.ts`, `notes.ts`, `tasks.ts`, `notebook.ts` (every widget interaction)
- **Impact:** Every navigation and every server action pays a full network round trip to Supabase (typically 50-150ms depending on region distance from the Vercel function to the Postgres instance) *before* any real work starts. This is the single biggest contributor to "every click has a small delay."
- **Recommended fix:** Switch to `session: { strategy: "jwt" }`. The `SupabaseAdapter` can stay for account/user persistence (GitHub OAuth linking), but session reads become a pure cookie decrypt — no DB call. The `session()` callback (`config.ts:37-40`) already only needs `user.id`, which can be carried in the JWT via a `jwt()` callback instead of re-read from the DB per request.

### C2. No `loading.tsx` anywhere — every navigation blocks on data before first paint

- **Files:** `apps/web/src/app/` (no `loading.tsx` at root or under `timeline/`, `tasks/`, `notes/`, `notebook/`, `steam/[appId]/`)
- **Why it happens:** Next.js only shows an instant route-level loading UI during a navigation if a `loading.tsx` exists for the segment (it becomes the `<Suspense>` boundary's fallback around `page.tsx`). Without one, the whole page — including static chrome like the "← Dashboard" link and `<h1>` — waits behind every `await` in the page component.
- **Example:** `apps/web/src/app/timeline/page.tsx:85-91`
  ```ts
  export default async function TimelinePage() {
    const session = await auth();          // DB round trip (see C1)
    if (!session?.user?.id) redirect("/");
    const memories = await listMemories(session.user.id); // another DB round trip
    ...
  ```
  Nothing renders until both complete, serially.
- **Impact:** Clicking "Timeline" (or Tasks/Notes/Notebook) in the nav shows a frozen page for the duration of two serialized DB calls, with zero visual feedback that the click registered.
- **Recommended fix:** Add a `loading.tsx` per route (a `Skeleton`-based shell, reusing `packages/ui/src/skeleton.tsx`) so Next.js can show it immediately while the segment streams in. This is a ~10-line file per route and is purely additive.

### C3. `revalidatePath("/")` on every widget action re-fetches the *entire* dashboard

- **File:** `apps/web/src/app/actions/widgets.ts:25, 64, 104`
- **Code:**
  ```ts
  revalidatePath("/");
  return {};
  ```
- **Why it happens:** `revalidatePath("/")` invalidates the whole `/` route's cache. On the next render, `page.tsx`'s `WidgetGrid` re-renders every `WidgetSlot`, each of which does:
  ```ts
  // apps/web/src/app/page.tsx:129-132
  const [cached, settings] = await Promise.all([
    readWidgetCache(userId, widget.id, widget.dataSchema),
    readWidgetSettings(userId, widget.id),
  ]);
  ```
  That's 2 Supabase queries × 9 registered widgets (hero, github, steam, spotify, tasks, notes, notebook, rss, + the "coming soon" placeholders don't count but the 7 real ones do) = up to 14 round trips, to re-render eight widgets that never changed, because one of them was refreshed.
- **Impact:** Clicking "Refresh" on a single widget (via `WidgetMenu`'s `ActionForm`) or the global refresh title pays the cost of reloading the *whole page's* data, not just the widget that changed.
- **Recommended fix:** Use a narrower invalidation. Options, in order of preference:
  1. Return the refreshed widget's data directly from the action (as Hero's `cycleQuote` already does — see `packages/sdk/src/widget.ts`'s `WidgetActionState.quote` comment, which explicitly notes this pattern exists "without forcing every other widget to re-read its cache too") and update that one widget's subtree client-side, no `revalidatePath` at all.
  2. If a server round-trip is required, scope invalidation with `revalidateTag` per-widget (tag each `readWidgetCache` call with `widget:${widgetId}`) instead of revalidating the whole path.

### C4. Refresh actions block on live third-party API calls before the UI can update

- **File:** `apps/web/src/lib/refresh-widget.ts:30-55`, called from `apps/web/src/app/actions/widgets.ts:20, 47`
- **Code:**
  ```ts
  const [previous, data] = await Promise.all([
    readWidgetCache(userId, widgetId, widget.dataSchema),
    widget.fetchData({ userId, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }), // up to 10s
  ]);
  await writeWidgetCache(userId, widgetId, data, readAsOf);
  ```
  `FETCH_TIMEOUT_MS = 10_000` (`refresh-widget.ts:12`).
- **Why it happens:** `refreshWidgetAction`/`refreshAllWidgetsAction` are `useActionState`-driven forms (`RefreshAllTitle`, `WidgetMenu`'s `ActionForm`). The button shows `isPending` (a 60%-opacity dip / spinner), but the *actual* external GitHub/Steam/RSS/weather API calls happen synchronously inside the action, so "small delay" for a refresh click can legitimately be seconds, not milliseconds, especially for `refreshAllWidgetsAction` which fans out to every widget's `fetchData` at once (bounded by the slowest one).
- **Impact:** This is expected/correct behavior for an explicit "Refresh" action (real work must happen), but it's worth flagging because it's easy to mistake for the same "small delay" bug affecting *navigation* — it isn't the same cause as C1/C2, and fixing C1/C2 won't touch this. If the reported per-click delay includes refresh clicks, this is why those specifically feel slow.
- **Recommended fix:** Not a bug to "fix" outright, but consider: (a) surfacing per-widget last-refreshed time so users aren't tempted to refresh unnecessarily, (b) lowering `FETCH_TIMEOUT_MS` per adapter based on realistic p99s instead of one flat 10s for all of them, (c) making `refreshAllWidgetsAction`'s pending state visually distinct from a single-widget refresh so users understand it's doing more work.

---

## High

### H1. Two serialized Supabase round trips per widget, times N widgets, on every dashboard load

- **File:** `apps/web/src/app/page.tsx:128-132`
- **Code:**
  ```ts
  const [cached, settings] = await Promise.all([
    readWidgetCache(userId, widget.id, widget.dataSchema),
    readWidgetSettings(userId, widget.id),
  ]);
  ```
- **Why it happens:** Each is a separate `createServiceClient()` + REST call to Supabase's PostgREST (`packages/database/src/widget-cache.ts:22-28`, `widget-settings.ts`). They're parallelized *within* one widget via `Promise.all`, and each `WidgetSlot` is independently wrapped in `<Suspense>` (`page.tsx:167-173`) so widgets stream in as they resolve rather than blocking each other — that part is good. But there's no batching *across* widgets: 7 real widgets × 2 queries = 14 network calls to render the dashboard once.
- **Impact:** More total server-side latency and Supabase connection/request overhead than necessary; on a cold Vercel function this adds up before the page is fully streamed.
- **Recommended fix:** Add a single `readAllWidgetCacheAndSettings(userId)` that does one `widget_cache` query and one `widget_settings` query (both already keyed by `user_id`, not `user_id + widget_id`) filtered to the registered widget IDs, then distributes rows in memory. Cuts 14 round trips to 2.

### H2. `createServiceClient()` is instantiated fresh on every call, with no request-scoped reuse

- **File:** `packages/database/src/client.ts:7-20`, called from every function in `packages/database/src/*.ts` (e.g. `widget-cache.ts:22`, `74`)
- **Why it happens:** `createServiceClient()` calls `createClient(...)` from `@supabase/supabase-js` fresh every time — there's no memoization (e.g. via React's `cache()`) even within a single request that calls it a dozen times (per H1).
- **Impact:** Each call re-parses config and constructs a new client/fetch wrapper. Not as costly as a real DB round trip, but it's pure waste repeated 14+ times per dashboard load, and it's an easy, risk-free fix.
- **Recommended fix:** Wrap `createServiceClient` in React's `cache()` (`import { cache } from "react"`) so it's memoized per request/render pass:
  ```ts
  export const createServiceClient = cache((): SupabaseClient => { ... });
  ```

### H3. Unused Google Fonts are downloaded on every page load

- **File:** `apps/web/src/app/layout.tsx:6-14`, `apps/web/src/app/globals.css:47-48`
- **Code:**
  ```ts
  const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
  const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
  ```
  ```css
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  ```
- **Why it happens:** The Classical design system (per `docs/DESIGN_SYSTEM.md` and `CLAUDE.md`) explicitly specifies **serif type — Cormorant Garamond headings, Lora body — over sans-serif UI chrome.** Grepping the entire `apps/web` and `packages` trees for `font-sans`/`font-mono`/`--font-geist` usage in actual class names turns up **zero** consumers — only the definitions in `globals.css` and `layout.tsx` reference them. Geist and Geist Mono appear to be leftover from a template/starter and were never removed after the Classical redesign replaced sans-serif chrome with Lora/Cormorant Garamond.
- **Impact:** Two full variable font families are fetched, parsed, and held in memory on every load for zero visual benefit — pure dead weight on the critical rendering path (`next/font` self-hosts and inlines `@font-face`, so this is a real bytes-on-the-wire cost, not just unused CSS).
- **Recommended fix:** Delete the `Geist`/`Geist_Mono` imports and their `variable` classes from `layout.tsx`, and the `--font-sans`/`--font-mono` theme tokens from `globals.css`, unless something in the codebase actually needs a monospace/sans fallback (confirm with a full-text search before removing, but the search here found none).

### H4. `SPRING_PRESS` hover-scale transition is applied to nearly every interactive control

- **File:** `packages/ui/src/glass.ts:26-27`, used in `packages/ui/src/widget-menu.tsx:54`, `action-form.tsx:64/67`, `apps/web/src/app/page.tsx:106`, `apps/web/src/app/profile-menu.tsx:48`, and others
- **Code:**
  ```ts
  export const SPRING_PRESS =
    "transition-transform duration-150 ease-out motion-safe:hover:scale-105 motion-safe:active:scale-95";
  ```
- **Why it happens:** This is a CSS transition, not a JS delay — the `onClick` handler itself fires immediately, so it doesn't block the *actual* navigation/action. But it's worth flagging as a likely contributor to the **perceived** delay the user described: every button/icon-badge/menu-trigger scales up 5% on hover over 150ms and back down 5% on press, which — especially stacked with the `WidgetMenu`/`ProfileMenu` dropdown's own 150ms opacity+scale transition (`widget-menu.tsx:66`) — means the visual acknowledgment of a click is consistently ~150-300ms behind the click itself, even though the underlying state change (e.g. `setOpen`) is synchronous.
- **Impact:** Low technical severity (nothing is blocked), but this is exactly the kind of thing that reads as "everything feels a little laggy" without any single interaction being provably slow in DevTools' Performance tab — because the JS work is instant and the *animation* is what's slow.
- **Recommended fix:** Not necessarily a bug — this is a deliberate design choice (`glass.ts`'s comments describe it as intentional "spring" feedback). Flagging so it's considered: if the goal is to feel "instant," consider shortening `duration-150` to `duration-100` or dropping the hover-scale (keep only `active:scale-95`) on high-frequency controls like `WidgetMenu`'s trigger and `ProfileMenu`'s avatar button, where the animation is pure decoration on a control whose entire job is opening a menu as fast as possible.

---

## Medium

### M1. `Home` (`/`) blocks its entire shell — including the static, non-personalized parts of `<Navbar>` — behind `auth()`

- **File:** `apps/web/src/app/page.tsx:50-68`
- **Code:**
  ```ts
  export default async function Home() {
    const session = await auth();     // DB round trip (C1)
    return (
      <div ...>
        <Navbar session={session} />
        <main ...>
          {session?.user?.id ? <WidgetGrid userId={session.user.id} /> : <p>...</p>}
        </main>
      </div>
    );
  }
  ```
- **Why it happens:** `Navbar` needs `session` to decide between the signed-in `ProfileMenu`/`RefreshAllTitle` and the signed-out logo/"Sign in" button, so the whole component tree — including markup that doesn't depend on the session at all (the `<header>` wrapper, layout classes) — is gated behind the same `await auth()` that also gates the widget grid.
- **Impact:** Compounds with C1/C2: there's no partial shell paint at all for `/`. Given this is fixed by C1 (JWT sessions resolve far faster) this is lower severity than C1/C2 on its own, but worth noting as a structural pattern to avoid repeating.
- **Recommended fix:** Once C1 lands, this is likely fine as-is (JWT `auth()` is fast enough not to matter). If further hardening is wanted, `Navbar`'s session-independent chrome could render synchronously with `session` streamed in via `Suspense`, but this is not worth the complexity unless C1 alone doesn't resolve the symptom.

### M2. `readWidgetSettings` / `ensureWidgetRegistered` add further un-batched queries on settings saves

- **File:** `apps/web/src/app/actions/widgets.ts:91-99`
- **Code:**
  ```ts
  await ensureWidgetRegistered(widget.id, widget.name);
  await writeWidgetSettings(session.user.id, widgetId, settings);
  await refreshWidget(widgetId, session.user.id);
  ```
- **Why it happens:** Three sequential `await`s (not `Promise.all`'d, and they can't fully be — `ensureWidgetRegistered` must precede `writeWidgetSettings` per the FK comment — but `refreshWidget` genuinely could start its `readWidgetCache` half concurrently) plus everything `refreshWidget` itself does (C4) plus the `auth()` call (C1) plus the eventual `revalidatePath("/")` (C3).
- **Impact:** Saving any widget's settings is the slowest single interaction in the app — it stacks nearly every issue in this document (auth DB call → registry upsert → settings write → full refresh incl. live API call → full-page revalidation).
- **Recommended fix:** Once C1/C3/C4 are addressed individually, this path improves for free. No separate fix needed beyond those.

### M3. No explicit caching layer between Server Components and Supabase (`unstable_cache` / tags)

- **Files:** `packages/database/src/*.ts` (all read functions — `readWidgetCache`, `readWidgetSettings`, `listMemories`, `listNotebookEntries`)
- **Why it happens:** Every read goes straight to Supabase with no `unstable_cache`/`fetch`-cache/tag-based memoization. Given the app already treats `widget_cache` as *the* cache layer (data is only ever as fresh as the last cron/refresh run — see `docs/ARCHITECTURE.md`'s scheduler-first design), there's no reason each Server Component render should re-hit Postgres for data that, by design, only changes once per refresh cycle.
- **Impact:** Moderate — this is the same class of cost as H1, just framed differently (missing an opportunity rather than an active bug).
- **Recommended fix:** Wrap `readWidgetCache`/`readWidgetSettings` reads in `unstable_cache` keyed by `userId:widgetId`, tagged `widget:${widgetId}`, and have `writeWidgetCache`/`writeWidgetSettings` call `revalidateTag` for that specific tag instead of (or in addition to) the page-wide `revalidatePath("/")` in C3. This directly enables the C3 fix.

---

## Low

### L1. `RegisterServiceWorker` registers a service worker on every client mount with no scope/update strategy shown

- **File:** `apps/web/src/app/register-service-worker.tsx:1-13`
- **Code:**
  ```ts
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  ```
- **Why it happens:** Not itself a performance bug, but worth checking `public/sw.js`'s caching strategy (not reviewed in this pass — flagging as a follow-up) since a misconfigured service worker (e.g. one that doesn't let navigation requests hit the network fresh, or that revalidates aggressively) is a classic source of "click feels delayed" that's invisible in normal server-side profiling.
- **Recommended fix:** Audit `apps/web/public/sw.js`'s fetch handler/cache strategy in a follow-up pass; out of scope here since it wasn't part of the reviewed source tree.

### L2. `use-pull-to-refresh.ts` attaches `touchmove`/`touchend` listeners at the `document` level on every mount

- **File:** `packages/ui/src/use-pull-to-refresh.ts:97-100`
- **Code:**
  ```ts
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchmove", handleTouchMove, { passive: true });
  document.addEventListener("touchend", handleTouchEnd);
  document.addEventListener("touchcancel", handleTouchEnd);
  ```
- **Why it happens:** `touchstart`/`touchmove` are correctly marked `passive: true` (good — doesn't block scroll), but `touchend`/`touchcancel` aren't marked passive (likely fine since they don't call `preventDefault` in a way that needs blocking, but worth confirming). This hook is only mounted once (inside `RefreshAllTitle`, which renders once in the navbar), so the actual perf cost is negligible — noting only because document-level touch listeners are a common source of input latency on mobile Safari if `preventDefault` is called from a non-passive handler.
- **Impact:** Low — one instance, and the passive flags are already mostly correct.
- **Recommended fix:** No action needed unless profiling on real iOS Safari shows scroll jank; flagged for completeness since the task asked for a full audit of interaction handling.

### L3. No `dynamic()`/`React.lazy()` code-splitting anywhere in the app

- **Finding:** A full-repo search for `next/dynamic`, `React.lazy`, and dynamic `import(...)` across `apps/web/src` and `packages/**` returned zero results.
- **Why it happens:** Every client component (`ProfileMenu`, `WidgetMenu`, `RefreshAllTitle`, each widget's client-side pieces like `note-modal.tsx`, `heatmap.tsx`) is bundled into the initial client JS for `/`, rather than any being split out.
- **Impact:** Given the app's actual widget count and component sizes, this is unlikely to be the dominant cause of the reported click delay (most of the app's interactivity is server-action-driven, not client-bundle-driven), but it's worth measuring: run `pnpm build` and inspect the `.next` build output's route JS size for `/` to confirm whether this is worth addressing. Not measured in this pass since no changes/builds were run per the task's "don't implement anything yet" instruction.
- **Recommended fix:** After measuring actual bundle size from a real `pnpm build`, consider splitting rarely-interacted-with pieces (e.g. `note-modal.tsx`'s modal contents, `heatmap.tsx`'s day-popover) behind `next/dynamic` if they turn out to be meaningfully large. Don't do this speculatively — measure first.

---

## What to measure next (before implementing anything)

This audit is based on static code reading, not live profiling — per the task's instruction, nothing was run or changed. Before implementing fixes, confirm the hypothesis with real numbers:

1. **Network tab, Vercel function logs, or `console.time` around `auth()`** on a real deployed instance — confirm the database-strategy session lookup is actually costing the tens-of-milliseconds this audit assumes (C1).
2. **Chrome DevTools Performance recording of a `/` → `/timeline` navigation** — confirm there's a blank/frozen gap matching C2's prediction (no loading state).
3. **Vercel Postgres/Supabase dashboard query timing** for `widget_cache`/`widget_settings` reads during a dashboard load — confirm the 14-round-trip estimate in H1/C3.
4. **`pnpm build` route JS size for `/`** — confirm or rule out L3 as a contributor.

If (1) and (2) show the delay is dominated by C1+C2 (the most likely candidates given how uniformly they apply to *every* click/navigation, matching the reported symptom), fixing those two should be prioritized above the others — everything else in this document is real but smaller in scope.
