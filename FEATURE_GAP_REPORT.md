# Pulse Feature Gap Report — Daily Dashboard Review

Date: 2026-08-08
Lens: reviewed as the owner opening Pulse every morning — not "what widget
is missing," but "what makes the fifteen seconds I spend here each day
slower, clunkier, or less trustworthy than it should be." No new widgets
suggested, per the brief. Findings only — nothing implemented.

This report draws directly on the app's own `docs/DECISIONS.md` history
(dated, real usage feedback already recorded there) plus a fresh read of
the actual daily-interaction code paths — refresh, add-task, add-note,
add-notebook-entry, RSS/Steam/GitHub glance, and navigation between the
dashboard and its detail pages.

---

## How to read this

Ranked by **daily impact** — how much a finding actually costs the person
opening this dashboard every morning, not by engineering severity. A
one-line CSS fix that's invisible day-to-day ranks below a workflow
interruption that happens on every single visit, even if the code change
behind the fix is bigger. Each entry has the **daily moment** it happens
in, **why it's friction**, and a **recommended direction** (not a spec).

---

## Ranked findings

### 1. Critical — First glance of the day can show stale data, and fixing it costs a multi-second wait that reloads everything

- **Daily moment:** Opening Pulse first thing in the morning. Data refreshes on a 30-minute cron cycle (`docs/PROJECT_REFERENCE.md` §4, confirmed running per `docs/ROADMAP.md`'s "GitHub Actions scheduler" section). If the last automatic refresh landed at 6:47am and Pulse is opened at 7:00am, everything shown is already 13 minutes stale — worse right after an overnight gap, since the last refresh before opening could be from the previous evening if the schedule doesn't align with "when I actually wake up."
- **Why it's friction, not just a number:** The only way to force freshness is the global refresh (the "Pulse" wordmark tap) — which, per `apps/web/src/lib/refresh-widget.ts`, synchronously calls every widget's live `fetchData()` (GitHub, Steam, RSS, weather) with up to a 10-second timeout **each**, all fired in parallel but bounded by the slowest one, then reloads the entire page's data (`revalidatePath("/")` in `apps/web/src/app/actions/widgets.ts:64`). So "make sure I'm looking at today's numbers" — a completely reasonable first action of the day — costs several seconds of a subtly-animated wait (a 60%-opacity dip on the logo, `refresh-all-title.tsx:128-130`) with no indication of which widget, if any, is the slow one.
- **Impact:** This is the single highest-frequency friction point in the app, because it happens at the start of *every* session, not just occasionally.
- **Recommended direction:** Two independent, additive improvements: (a) show a visible "last updated" timestamp somewhere in the shell (not per-widget — one glance, one answer to "is this fresh") so the decision to manually refresh is informed rather than reflexive; (b) once a widget's own refresh completes, update just that widget's UI instead of waiting on `revalidatePath("/")` to re-read every widget's cache — `packages/sdk`'s own `WidgetActionState.quote` field already demonstrates this exact pattern working for Hero's quote-cycling ("returned directly instead of via a page-wide revalidatePath so the click updates instantly without forcing every other widget to re-read its cache too" — see that field's own doc comment). Extending that idea to the general refresh case removes both the wait and the all-or-nothing reload.

### 2. High — Adding a quick note takes 3x the effort of the functionally-identical Notebook entry sitting right next to it

- **Daily moment:** Jotting something down — a quick thought, a link, a reminder — during the daily glance. Pulse has two widgets built for exactly this: Notes and Notebook, positioned side by side in the dashboard's top row (`apps/web/src/app/page.tsx`'s `rowTopWidgets`).
- **Why it's friction:** Notebook (`packages/widgets/notebook/src/notebook-input.tsx`) is genuinely frictionless — type into the box, pause for ~1 second, it's saved, no click required (its own doc comment: "pausing autosaves it"). Notes, for what is often the same mental action ("write something down right now"), requires: click "Write a note..." → a modal opens → fill in a **required title field** → fill in the body → click "Save" → the modal closes (`packages/widgets/notes/src/notes-card.tsx:39-45`, `note-modal.tsx:61-101`). Two widgets solving overlapping daily needs, with meaningfully different effort required for the same "capture this thought" moment — and no guidance anywhere in the UI for *which one* a quick thought should go into.
- **Impact:** High, because "quickly write something down" is exactly the kind of action a personal dashboard should make closer to zero-friction, and today one of the two paths for it already is — the other isn't, right next to it.
- **Recommended direction:** Not "delete one of them" (they serve genuinely different purposes — Notes are titled/editable/organized, Notebook is a stream-of-consciousness log) — but consider whether Notes' dashboard-card quick-add specifically (not the full `/notes` page, which reasonably wants title/body) could drop the required-title friction for the common case, e.g. auto-generating a title from the first line of the body the way many quick-capture apps do, only prompting for a real title on the full `/notes` page where organizing actually happens.

### 3. High — Deleting a task or note is instant, silent, and has no undo

- **Daily moment:** Morning task triage — clearing completed items, cleaning up a note that's no longer needed. `packages/widgets/tasks/src/task-row.tsx:46-56`'s delete button fires immediately on click/tap, no confirmation, no way to recover.
- **Why it's friction:** This isn't a "nice to have" — it's a real daily risk specifically because the *adjacent* control (the checkbox, at `task-row.tsx:28-35`) sits right next to the delete button in the same compact row, both sized to the same 44×44px touch target. A mis-tap on a phone during a quick morning glance permanently loses a task with zero recovery path — the exact kind of small, easily-avoidable trust erosion that makes someone stop trusting a daily tool with their real to-do list.
- **Impact:** High — trust in a daily tool depends on it never quietly losing something typed into it. A single bad experience here (a mis-tapped delete during a rushed morning check) is the kind of thing that makes someone go back to checking tasks somewhere else "just to be safe" — directly undermining the stated Phase 1 success gate of no longer needing to check things separately (`docs/PROJECT_REFERENCE.md` §18).
- **Recommended direction:** A lightweight undo (a few-second toast with "Undo" before the delete actually commits server-side) closes this without adding a disruptive confirmation dialog to a high-frequency, usually-correct action.

### 4. High — RSS feed sources can only be changed by editing source code and redeploying

- **Daily moment:** Reading the RSS widget's headlines, wanting to add a new blog, drop one that's gone stale, or reprioritize which source shows first.
- **Why it's friction:** `packages/widgets/rss/src/constants.ts` hardcodes the entire source list — five feeds (Palworld, Forza Horizon 6, 9to5Mac, MacRumors, GitHub Blog), each with a manually-assigned `priority` tier — with an explicit comment: *"Fixed source list for v1 — no settings UI... just a curated set."* `docs/DECISIONS.md`'s own recent history (2026-08-08 entries) shows this has already needed hands-on-code changes multiple times in quick succession: dropping OpenAI as a source, replacing a guessed Apple feed URL with two working ones, adding a priority-tier system, then adding a per-tier cap because one tier crowded out the others. **Every one of those was a code change + deploy**, for what is, in every other widget with user-facing settings (Steam's SteamID, for instance), a normal in-app settings form.
- **Impact:** High, specifically because the evidence shows this isn't hypothetical — the feed list has already changed multiple times in the app's real history, and every single change required leaving the app entirely (editing source, redeploying) instead of the 10-second in-app settings flow every other configurable widget already has. For a "personal OS" whose whole premise is that it adapts to what the owner actually reads/tracks day to day, this is the widget most likely to need small, frequent adjustments and currently has the highest-friction path to make them.
- **Recommended direction:** Give RSS the same `WidgetMenu` → Settings pattern Steam already has — a simple form (add/remove/reorder feed URL + label + tier) backed by `widget_settings`, same as every other widget's settings storage. This is a well-established pattern in the codebase already (`packages/widgets/steam/src/settings-form-fields.tsx` is a working reference), not new infrastructure.

### 5. Medium-High — The dashboard's four navigation-heavy detail pages (Tasks/Notes/Notebook/Timeline) hard-reload instead of navigating instantly

- **Daily moment:** Tapping "View all →" on Tasks, Notes, or Notebook's dashboard card to see full history, or the profile menu's Timeline link — something that happens naturally several times a week, not a rare event.
- **Why it's friction:** Every one of these dashboard-card links uses a plain `<a href>` instead of `next/link`'s `<Link>` (`packages/widgets/notes/src/notes-card.tsx:31-36`, `packages/widgets/tasks/src/component.tsx:19`, `packages/widgets/notebook/src/notebook-card.tsx:57`, and Steam's per-game links at `packages/widgets/steam/src/component.tsx:43-47`) — a full browser navigation (blank flash, full JS re-download) rather than the instant client-side transition the rest of the app's own pages correctly use for their own internal links. Going deeper into the app is the slow, jarring direction; coming back is instant.
- **Impact:** Medium-high — not data-loss-risky like #3, but a repeated, needless interruption to what should be a fluid "glance at the card, tap through for more, come back" rhythm — exactly the rhythm a daily dashboard lives or dies on.
- **Recommended direction:** Swap `<a>` for `<Link>` in these four files — a small, low-risk, high-frequency-payoff fix (the same fix already correctly applied to every one of these pages' own "← Dashboard" back-link).

### 6. Medium — No keyboard path for the handful of actions done every single day

- **Daily moment:** Refreshing, adding a task, jotting a note — the three or four actions that happen on essentially every visit.
- **Why it's friction:** None of them have a keyboard shortcut. A full-repo search for global keyboard-shortcut handling (beyond Escape-to-close on menus/modals) found none. For a tool opened once daily by one specific person (not a general-audience app where shortcuts need onboarding), this is a real missed opportunity — the entire value proposition of a daily-use personal tool is that repeated actions get *faster* to do over time, and right now every one of them costs the same reach-for-the-mouse effort on day 200 as on day 1.
- **Impact:** Medium — individually small per-use, but multiplied by "every single day, forever," small per-use costs are exactly where the compounding value of a shortcut shows up most.
- **Recommended direction:** A handful of shortcuts for the highest-frequency actions only — refresh-all (mirroring the existing tap-the-logo gesture), jump-to-add-task, jump-to-add-note. Not a full command palette; just closing the gap on the 3-4 things done daily.

### 7. Medium — Global refresh is one opaque wait with no per-widget signal

- **Daily moment:** Tapping the logo to refresh everything at once.
- **Why it's friction:** `refreshAllWidgetsAction` (`apps/web/src/app/actions/widgets.ts:37-69`) fans out to every registered widget's `fetchData()` in parallel and reports success/failure only once *all* of them finish — the UI shows one dip in opacity for the whole duration, with zero indication of which of the 7-8 widgets (if any) is the one taking a while, or which one, if any, failed, until the whole thing settles. If GitHub's API is slow today, there's no way to tell "it's GitHub" from "everything is just generally slow" until the refresh finishes and (only if something failed) an error message appears.
- **Impact:** Medium — doesn't block anything, but every refresh becomes a small trust question ("is this actually working?") rather than a confident, informative wait.
- **Recommended direction:** Even a minimal per-widget indicator (each `WidgetCard`'s own pending state lighting up individually as its refresh starts/completes, rather than only the global logo dimming) would turn one opaque wait into a legible one — and this data already exists server-side (`refreshAllWidgetsAction`'s `Promise.allSettled` already knows exactly which widget finished when); it's just not surfaced to the UI incrementally today.

### 8. Medium — "What's new since I last looked" requires manually re-scanning every widget

- **Daily moment:** The actual core moment of opening a daily dashboard: "what happened since yesterday?"
- **Why it's friction:** Every widget always shows its current-state snapshot (today's GitHub streak, this week's Steam activity, the latest RSS headlines) with no visual distinction between "this is the same as last time I looked" and "this changed since yesterday." The owner has to mentally diff every card against memory each morning. Notably, Pulse already has real infrastructure aimed at exactly this — the Memory/Timeline feature (`docs/MEMORY_ROADMAP.md`, `apps/web/src/app/timeline/page.tsx`) logs meaningful changes per widget (`deriveMemories`, present in 5 of 8 widget packages) — but it lives on a separate `/timeline` page, reached only via the profile menu, not surfaced anywhere in the default dashboard glance.
- **Impact:** Medium — this is precisely the job a "personal OS" morning view exists to do, and the pieces to do it (per-widget change detection, already built and already running) exist but aren't connected to the primary view.
- **Recommended direction:** Worth a deliberate look at whether a small "since yesterday" summary — even just a count or the top 2-3 memory events, already computed by the exact same `deriveMemories` pipeline the Timeline page draws from — belongs somewhere in Hero or the navbar, rather than requiring a dedicated visit to `/timeline` to learn "did anything actually change." (This tracks with the project's own Memory/Timeline roadmap's next milestone, M2 — daily/weekly rollups — so this finding lines up with work already planned, not a new direction.)

### 9. Low-Medium — Two "Coming soon" cards occupy permanent daily real estate for a feature that isn't being built yet

- **Daily moment:** Every single dashboard visit — the Habits and Reading placeholder cards render on every load (`apps/web/src/app/page.tsx:266-285`), full-width `WidgetCard`s at reduced opacity, sitting in the same grid row as live widgets.
- **Why it's friction:** Not functionally blocking, but it's a small daily reminder of unfinished work shown literally every time the dashboard is opened — the opposite of the "calm, considered" daily-use goal `docs/DESIGN_SYSTEM.md` explicitly aims for. `docs/ROADMAP.md`'s Phase 2 section confirms Habits "is still just a 'Coming soon' placeholder card with no real logic behind it," unchanged for some time.
- **Impact:** Low-medium — small per-glance cost, but it's a permanent one, paid on every visit rather than once.
- **Recommended direction:** Either commit to actually building Habits (it's explicitly still on the Phase 2 list) or drop the placeholder cards until there's real content — matching the same "don't scaffold ahead of need" principle `CLAUDE.md` already applies to navigation links.

### 10. Low — A previously-built widget (Quick Launch) no longer exists in the codebase, with no record of its removal

- **Daily moment:** Not a moment that happens today (it's already gone), but worth flagging directly: `docs/ROADMAP.md` and `docs/DECISIONS.md` both describe Quick Launch (`packages/widgets/quick-launch` — up to 6 shortcut links, icon-only tiles) as built and shipped, including multiple follow-up polish passes. **The package no longer exists anywhere in `packages/widgets/`** (confirmed directly — only `github`, `hero`, `notebook`, `notes`, `rss`, `spotify`, `steam`, `tasks` remain), and no `docs/DECISIONS.md` entry records its removal the way every other scope change in this project is otherwise carefully documented (Calendar/Email/YouTube/Focus-timer removals all have explicit, dated "permanently removed from scope" entries).
- **Why it matters for a daily-dashboard review:** If this was a deliberate removal, the docs are stale and should say so (matching this project's own high documentation-discipline standard everywhere else). If it wasn't deliberate, a widget the owner may have relied on for quick launching to frequently-used sites/tools is simply gone from daily use with nothing flagging the gap.
- **Recommended direction:** Confirm directly whether Quick Launch's removal was intentional; either restore it or add the same kind of dated, reasoned `docs/DECISIONS.md` entry every other removal in this project already gets.

### 11. Low — First-time/occasional widget setup (Steam, Spotify) has no visible "this needs attention" signal until you happen to open its menu

- **Daily moment:** Not daily, but recurring enough to matter — e.g. re-connecting Spotify after a token issue, or setting up Steam's SteamID for the first time.
- **Why it's friction:** A widget missing required configuration just shows its normal `EmptyState` message ("No data yet — set your SteamID64 in settings, then refresh," `packages/widgets/steam/src/component.tsx:59`) with no visual cue on the closed "⋯" menu itself that settings need attention — a returning user has to read the empty-state text carefully, then know to open the menu, then find Settings.
- **Impact:** Low — infrequent, but it's exactly the kind of small friction that turns a 30-second setup task into an "I'll deal with this later" deferral that then shows an empty card indefinitely.
- **Recommended direction:** Not urgent; flagged for completeness. A small visual cue (e.g. a subtle dot on the "⋯" trigger) for widgets with unset required settings would close this cheaply if it turns out to matter in practice.

---

## What's already working well (worth protecting, not "fixing")

Two things stood out as genuinely good daily-use design, worth calling out so they aren't accidentally regressed while addressing the items above:

- **Notebook's zero-click autosave** (finding #2's positive comparison point) is exactly the right amount of friction for its purpose — it should be the model other quick-capture flows move toward, not the odd one out.
- **The cron-first, cache-only data flow** (`docs/ARCHITECTURE.md`'s "Data flow" section) means every device always shows the same, consistent data with no per-device API rate-limit risk — the "stale until refreshed" cost in finding #1 is the deliberate trade-off this buys, and it's the right trade-off; the fix there is about *visibility* into freshness, not abandoning the caching strategy itself.

---

## Priority summary

If only a handful of these are pursued, in order of daily-impact-to-effort:

1. **#3 (undo for delete)** — cheapest fix here, closes a real daily trust risk.
2. **#5 (`<a>` → `<Link>` on 4 files)** — same scope of effort as the UX audit already identified this fix at, and it removes a jarring interruption from a several-times-a-week action.
3. **#4 (RSS settings UI)** — the feed list has already needed hands-on-code changes multiple times in this project's real history; this is the one item on this list with direct evidence it'll keep costing a deploy cycle if left as-is.
4. **#1 (refresh feedback + narrower invalidation)** — the highest-frequency friction point, but the larger of the fixes here (narrowing `revalidatePath`'s blast radius); worth scoping carefully rather than rushing.
5. **#9 (resolve the Habits/Reading placeholders)** — cheapest possible fix (delete two cards, or commit to building Habits), meaningful daily visual-calm payoff.
6. **#10 (confirm Quick Launch's fate)** — not a code fix, a five-minute decision that closes a real documentation/behavior gap.

Everything else here is real but smaller in scope — worth addressing, but these six are where "a dashboard that mostly works" most visibly tips into "a dashboard that feels like it was actually built for the person using it every day."
