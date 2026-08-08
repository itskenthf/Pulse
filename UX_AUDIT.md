# Pulse UX Audit

Date: 2026-08-08
Lens: reviewed as if this were a first-party Apple app — the bar is not
"does it work," it's "does every pixel and every millisecond feel considered."
Findings only. Nothing has been changed.

---

## How to read this

Each finding has a **severity** (Critical/High/Medium/Low — how much it
undermines the "calm, premium, considered" goal from `docs/DESIGN_SYSTEM.md`),
**exact files**, and a **recommended direction** (not a spec — no
implementation was done, per the task).

Categories audited: navigation friction, widget spacing, scroll behavior,
empty/loading/error states, mobile/desktop/tablet responsiveness, visual
consistency, keyboard shortcuts, accessibility, discoverability, animation
quality/timing, widget resizing, micro-interactions, hover states, focus
states, gesture support, visual hierarchy.

---

## Navigation

### N1 — Critical: "View all" links do a full page reload instead of a client-side transition

- **Files:** `packages/widgets/notes/src/notes-card.tsx:31-36`, `packages/widgets/tasks/src/component.tsx:19` (via its own footer, same pattern), `packages/widgets/notebook/src/notebook-card.tsx:57`, `packages/widgets/steam/src/component.tsx:43-47`
- **What's happening:** Every one of these uses a plain `<a href="/notes">` / `<a href={`/steam/${game.appId}`}>` instead of `next/link`'s `<Link>`. Meanwhile the standalone pages themselves (`/timeline`, `/tasks`, `/notes`, `/notebook`, `/steam/[appId]`) all correctly use `Link` for their own "← Dashboard" back-navigation (`apps/web/src/app/timeline/page.tsx:2,97`, etc.).
- **Why it matters:** Going *into* a detail view triggers a full browser navigation — a white flash, a full JS re-download/re-parse, loss of scroll position and any in-memory state, and (per the performance audit's C1/C2) an extra unnecessary round trip. Coming *back* is instant. That asymmetry is the opposite of what a considered app should feel like — the "forward" direction of the app's primary information architecture (dashboard → detail) is the slow, janky one.
- **Apple-app comparison:** Nothing in Apple's first-party apps ever hard-reloads for an in-app destination; navigating deeper always feels at least as fast as backing out.
- **Recommended direction:** Swap every one of these `<a>` tags for `<Link>` (already imported/used correctly elsewhere in the same codebase — this is a one-line-per-file consistency fix, not a new pattern).

### N2 — High: No way to get from a widget straight to the action it represents

- **Files:** `packages/widgets/github/src/component.tsx`, `packages/widgets/rss/src/component.tsx`
- **What's happening:** GitHub's heatmap and RSS's feed don't appear to link out anywhere obvious (worth confirming per-widget, but neither showed an outbound "open in GitHub" / "open article" affordance as clearly as Steam's cover art or Notes' modal does).
- **Why it matters:** A "personal OS" should treat every widget as a launch point, not just a readout. If GitHub shows today's commit but tapping it does nothing, that's a dead end where Apple's Weather/Stocks apps would deep-link into more detail.
- **Recommended direction:** Confirm/ensure every widget's primary content is a real link to its source of truth (GitHub commit → GitHub, RSS headline → the article), consistent with Steam's own game-tile pattern.

### N3 — Medium: The nav bar's non-functional links are shown as disabled text, not hidden

- **File:** `apps/web/src/app/profile-menu.tsx:8-12, 118-153`
- **What's happening:** `NAV_LINKS` includes `{ label: "Settings", href: undefined }`, rendered as a grey, `title="Coming soon"` unclickable row inside the profile menu (lines 144-152).
- **Why it matters:** This directly contradicts `CLAUDE.md`'s own scaffolding rule ("don't add nav links... for widgets/routes that don't exist yet") and `docs/DESIGN_SYSTEM.md`'s Navigation section ("Does not include placeholder links to unbuilt destinations"). A dead, greyed-out menu item is exactly the kind of "software trying to look important" the design philosophy explicitly rejects — it signals unfinished work inside the one polished surface (the account menu) that should feel most complete.
- **Recommended direction:** Remove the "Settings" row entirely until the route exists, per the project's own stated rule — don't leave it as a visible placeholder.

### N4 — Medium: No breadcrumb or visual continuity between dashboard and detail pages

- **Files:** `apps/web/src/app/tasks/page.tsx`, `notes/page.tsx`, `notebook/page.tsx`, `timeline/page.tsx`, `steam/[appId]/page.tsx`
- **What's happening:** Each detail page opens with a small "← Dashboard" text link (e.g. `timeline/page.tsx:97-102`) and its own `<h1>`, with no shared header/chrome connecting it back to the dashboard's navbar (no logo, no profile menu, no consistent top bar).
- **Why it matters:** Landing on `/tasks` feels like a different, smaller app bolted onto the dashboard rather than a drill-down within the same OS — there's no persistent global chrome (the refresh title, the profile menu) once you leave `/`. Apple's own apps keep a consistent nav affordance (even if it collapses to just a back chevron) rather than swapping to a bare content page.
- **Recommended direction:** Consider whether these detail pages should share the same `<Navbar>` shell as the dashboard (minus the widget grid), so the app never feels like it "exits" into a different, chrome-less experience.

---

## Widget spacing & visual hierarchy

### S1 — Low: The two "Coming soon" placeholder cards compete for attention with real content

- **File:** `apps/web/src/app/page.tsx:266-285`
- **What's happening:** "Habits" and "Reading" render as full `WidgetCard`s at `opacity-70`, sitting in the same grid row as live, real-data widgets (Steam/RSS column).
- **Why it matters:** `docs/DESIGN_SYSTEM.md`'s hierarchy principle is "users should instantly know where to look, what matters, what can wait" — but these unfinished cards are styled almost identically to working ones (same card shell, same icon badge, same title treatment), just slightly faded. On first glance they read as *broken* widgets, not intentionally-not-yet-built ones. This works against premium feel — a considered app doesn't show its own construction site.
- **Recommended direction:** Either drop them from the grid until built (matches the "don't scaffold ahead of need" rule already established for nav links — see N3) or redesign them as something visually distinct from a real widget (e.g. a single unobtrusive text row, not a full card shell), so "not built yet" reads unmistakably differently from "a widget with content."

### S2 — Medium: Compact-card content density varies by widget without an obvious rule

- **Files:** `packages/ui/src/widget-card.tsx:27-30` (the `compact` prop), used by Tasks/Notes/Notebook only
- **What's happening:** Three widgets (Tasks, Notes, Notebook) get `p-4`/`gap-2.5` (reduced padding), while GitHub/Steam/RSS get the default `p-5`/`gap-4`. The rule ("Ken's own daily-input widgets" per `page.tsx`'s comment) is sound conceptually but isn't visible anywhere in the UI itself — a user just sees three cards that are subtly tighter than their neighbors with no visual cue for *why*.
- **Why it matters:** Small, unexplained inconsistencies are what separate "a system" from "a set of components that mostly match." Not wrong, but worth a deliberate visual signal (e.g. these three sharing a distinct row/section treatment, which the layout partially does via the top row grouping) so the density difference reads as intentional grouping, not inconsistency.
- **Recommended direction:** No code fix needed — just confirm the top-row grouping (Tasks/Notes/Notebook together, per `page.tsx`'s `rowTopWidgets`) is doing enough visual signaling on its own; consider a subtle section label ("Today") if it isn't.

### S3 — Low: `gap-5`/`gap-6` and `p-4`/`p-6` breakpoint jumps are coarse

- **File:** `apps/web/src/app/page.tsx:223, 238`
- **What's happening:** Spacing jumps directly from `gap-5`(20px)/`px-4` at base to `sm:gap-6`(24px)/`sm:px-6` — a single step at one breakpoint, nothing at `md`/`lg`/`xl`. On very wide desktop viewports (the grid caps at `max-w-[1600px]`, `page.tsx:238`), the same 24px gutter used on a small laptop is reused on an ultra-wide monitor.
- **Why it matters:** Not broken, but a considered desktop-first app (per `docs/DESIGN_SYSTEM.md`'s "Desktop first" layout note) usually scales rhythm with viewport more than a single breakpoint jump, especially since the max-width cap already acknowledges very wide screens need special handling.
- **Recommended direction:** Low priority; only worth revisiting if real-device review at 1920px+/2560px+ shows the gutters feel disproportionately tight relative to the capped content width.

---

## Scroll behavior

### SC1 — Medium: No scroll-margin for anchor/deep-link targets under the sticky navbar

- **File:** `apps/web/src/app/page.tsx:78` (`sticky top-0 z-20` navbar), no `scroll-margin-top` found anywhere in `globals.css` or component classes.
- **Why it matters:** The navbar is `sticky`, so any future in-page anchor scroll (or even the browser's own "scroll to focused element" behavior for a keyboard user tabbing to a widget near the top) can land content partially underneath the fixed header. Not currently triggering a visible bug (no in-page anchors exist yet), but it's a latent trap the moment one is added (e.g. a "jump to widget" feature).
- **Recommended direction:** Add `scroll-margin-top` matching the navbar's height to any future anchor targets; not urgent today since nothing currently exercises it.

### SC2 — Low: Modal and dropdown scroll-locking is body-wide, not scoped

- **File:** `packages/ui/src/modal.tsx:37-38` (`document.body.style.overflow = "hidden"`)
- **Why it happens:** Standard technique, correctly implemented (restores previous value on close) — flagging only because on iOS Safari this alone doesn't prevent background *touch* scroll/rubber-banding behind a modal (only wheel/keyboard scroll). `WidgetMenu`'s dropdown (`widget-menu.tsx`) doesn't lock scroll at all, which is correct for a small dropdown but worth confirming intentional.
- **Recommended direction:** If real-device testing shows background rubber-banding behind an open `Modal` on iOS, add a touch-move guard scoped to the scrim; otherwise no action needed.

### SC3 — Low: Notebook/RSS lists have no visible scroll affordance when content overflows

- **Files:** `packages/widgets/notebook/src/notebook-entry-list.tsx`, `packages/widgets/rss/src/component.tsx` (not fully reviewed line-by-line in this pass, flagged from the shared pattern: `WidgetCard` has no built-in max-height/overflow handling — `packages/ui/src/widget-card.tsx` has no `overflow` in `cardShellClass`)
- **Why it matters:** Since "widgets size to their own content height" (per `CLAUDE.md`'s layout standard, deliberately no forced equal-height grid), a widget with a long list has no internal scroll — it just grows the card taller. That's consistent with the stated design intent, but means a widget with a lot of content (many notebook entries, a long RSS feed) can dominate the page's vertical rhythm instead of scrolling internally. Worth confirming this is the deliberate choice for every list-style widget, not just RSS/Notebook by omission.
- **Recommended direction:** Confirm intentionally — if any list-style widget is meant to cap height and scroll internally (rather than grow indefinitely), that needs an explicit `max-h-*`/`overflow-y-auto` on the widget's own body, not the shared card shell.

---

## Loading states

### L1 — Critical: No `loading.tsx` anywhere — a click has zero immediate visual feedback

- **Files:** `apps/web/src/app/` — no `loading.tsx` at root or under any route segment
- **What's happening:** Also covered from a raw-latency angle in `PERFORMANCE_AUDIT.md`'s C2, but it's a UX defect independent of the actual latency number: even if navigation were instant, without a `loading.tsx` there is no Next.js-driven transitional UI at all — the previous page just sits frozen (still fully interactive-looking, buttons still appear clickable) until the new page's data resolves.
- **Why it matters:** This is the single biggest gap between Pulse and an Apple first-party app. Apple's apps *always* show something the instant you tap — a skeleton, a spinner, a cross-fade — never a frozen screen that might or might not have registered your tap. A frozen screen reads as "did that even work?", which is worse for perceived quality than a visible loading state, even a slower one.
- **Recommended direction:** A `loading.tsx` per route, reusing the existing `Skeleton` primitive (`packages/ui/src/skeleton.tsx`) that widgets already use — this is a purely additive change with an established pattern to copy.

### L2 — Medium: The dashboard's per-widget skeletons don't match each widget's actual shape

- **File:** `packages/ui/src/skeleton.tsx:18-43`
- **What's happening:** Every non-hero widget gets the identical generic skeleton (an icon-badge block + title block + 4 text lines), regardless of whether the real widget is GitHub's heatmap grid, Steam's two cover-art tiles, or Tasks' checklist rows.
- **Why it matters:** A generic skeleton is a reasonable baseline (and the doc comment correctly notes it lets widgets stream independently), but a *premium* loading state previews the actual content shape — Apple's own apps (App Store, Music, News) skeleton the specific layout that's coming (album art squares, headline blocks), not a one-size-fits-all placeholder. Right now every widget "pops in" from an identical grey block to a very different real layout, which reads as a layout shift even though the card's outer height is roughly preserved.
- **Recommended direction:** Consider per-widget skeleton variants (at minimum: a "two square tiles" variant for Steam, a "grid" variant for GitHub's heatmap) if this is worth the added maintenance — flagged as an enhancement, not a defect; the current generic skeleton is functional.

### L3 — Low: Refresh pending state is a 60%-opacity dip, easy to miss

- **File:** `apps/web/src/app/refresh-all-title.tsx:128-130`, `packages/ui/src/action-form.tsx:70-81`
- **What's happening:** The global refresh (the "Pulse" wordmark) dips to `opacity-60` while pending; per-widget refresh (via `WidgetMenu`) shows a spinning `RefreshCw` icon only in the "icon" variant, or literally the text "…" in the "menu"/"text" variant (`action-form.tsx:77-81`).
- **Why it matters:** An ellipsis as the *only* pending indicator for a menu-row refresh action is easy to miss, especially since (per the performance audit's C4) a refresh can legitimately take several seconds waiting on a live third-party API. A user who doesn't notice the subtle opacity/ellipsis change may click "Refresh" again, or assume it's broken.
- **Recommended direction:** A small inline spinner (matching the "icon" variant's `RefreshCw` + `animate-spin` treatment) for the "menu" variant too, so every pending refresh state looks the same regardless of which button triggered it.

---

## Empty states

### E1 — Low: Empty states are well-built but visually flat compared to the design system's own ambitions

- **Files:** `packages/ui/src/empty-state.tsx`, usages across widgets (e.g. `packages/widgets/steam/src/component.tsx:56,59`)
- **What's happening:** Every empty state is centered muted text, no icon, no illustration — consistent (good) but also the least "considered" surface in the app. Compare to Apple's empty states (Reminders' "No Reminders," Photos' empty albums), which usually pair a large, quiet icon with the text rather than text alone.
- **Why it matters:** Not a defect — deliberately restrained per the design system's "content first, no decoration" principle — but worth a conscious check: is bare centered text actually the *most* editorial/considered treatment, or just the simplest? A well-set page (the stated inspiration) uses typographic hierarchy even in its empty moments (e.g. a small caption above the message, or the widget's own icon repeated large and faint).
- **Recommended direction:** Consider a subtle, on-brand enhancement — e.g. the widget's own icon rendered large and faint (using the existing `ACCENT_BADGE`/icon system, no new assets) above the message — before dismissing this as "already done." Purely optional; current implementation is not wrong.

### E2 — Medium: Steam's empty state buries an actionable fix in body text instead of an action

- **File:** `packages/widgets/steam/src/component.tsx:56, 59`
- **Code:**
  ```tsx
  <EmptyState message={`No games played in the last 2 weeks — or your Steam profile's "Game details" privacy isn't set to Public.`} />
  ...
  <EmptyState message="No data yet — set your SteamID64 in settings, then refresh." />
  ```
- **Why it matters:** `EmptyState`'s own `action` prop exists precisely for this ("Spotify's 'Connect Spotify' button" is cited in its own doc comment, `empty-state.tsx:5-6`) but Steam's "no data yet" empty state — which explicitly tells the user to go open Settings — doesn't use it. The user has to read a sentence, then manually locate the "⋯" menu, then find "Settings" themselves, for something the empty state could point at directly.
- **Recommended direction:** Give Steam's no-SteamID64 empty state an `action` (e.g. a button that opens the same settings disclosure `WidgetMenu` already renders), consistent with how Spotify's widget apparently already does this.

---

## Error states

### ER1 — Low: Error state never offers a manual retry

- **File:** `packages/ui/src/error-state.tsx:9-19` (see its own doc comment: "No retry button here: a widget that failed before rendering has no WidgetMenu to offer one from.")
- **Why it matters:** This is a real, correctly-reasoned technical constraint (a widget whose Server Component threw never got far enough to render its own `WidgetMenu`), not an oversight — but from a pure UX standpoint, a user staring at "GitHub is unavailable" with no button to press, only the promise it'll "retry on the next refresh," is a dead end in the moment. Apple's apps (Mail, News) almost always give you *something* to press even when the real fix is "try again later."
- **Recommended direction:** Consider whether `WidgetErrorBoundary` could render a minimal, chrome-independent retry affordance (e.g. a plain link that calls `refreshAllWidgetsAction`, since that's already available at the page level and doesn't depend on the failed widget's own menu) rather than leaving the card fully inert.

### ER2 — Low: All widget errors show the same generic title, losing signal on *why*

- **File:** `packages/ui/src/widget-error-boundary.tsx:60-65`
- **Code:** `title={`${this.props.name} is unavailable`}`, `message="Other widgets are unaffected — it'll retry on the next refresh."`
- **Why it matters:** Good, calm, on-brand copy — but always identical regardless of cause (rate limit vs. network failure vs. a real bug), which is fine for now given the app's single-user scope, but worth flagging: if a future refactor threads the actual error through `componentDidCatch` into the rendered message (it currently only `console.error`s it, `widget-error-boundary.tsx:48-50`), users could distinguish "GitHub is rate-limited, back in 10 minutes" from a genuine bug — a small but real trust-building detail.
- **Recommended direction:** Optional enhancement, not urgent — the current generic message is a defensible, calm default.

---

## Mobile / tablet / desktop responsiveness

### R1 — Medium: The heatmap's `MAX_CELL_PX = 11` means GitHub's widget looks nearly identical at every width above its collapse point

- **File:** `packages/widgets/github/src/heatmap.tsx:28, 61-63`
- **Why it matters:** The cqw-based sizing (thoughtfully engineered — see the file's own extensive comments) caps cells at 11px, so on a wide desktop `lg:col-span-2` card, most of the extra width just adds empty margin rather than a more spacious, more legible grid. Not wrong (matches "GitHub's own contribution graph uses a fixed, small cell size"), but worth a deliberate look at whether the widest desktop breakpoint should show *more weeks* of history instead of just more whitespace, now that width is available.
- **Recommended direction:** Consider showing a longer contribution window (e.g. 6 months → a full year) specifically at `lg`+ where the card is widest, rather than capping cell size and leaving the reclaimed width unused.

### R2 — Medium: Steam's side-by-side game tiles have no defined behavior below their two-item minimum width

- **File:** `packages/widgets/steam/src/component.tsx:41` (`flex flex-row gap-3`, both tiles `flex-1`)
- **Why it matters:** Two `flex-1` tiles side-by-side inside a narrow rail column (the Steam+RSS side column is `lg:row-span-2`, sharing width with a 1-of-3 grid track — see `page.tsx:257`) means on smaller tablet widths, each cover art tile could get quite narrow before the grid itself reflows to a single column. Worth a real-width check (per `CLAUDE.md`'s explicit instruction to verify with real Playwright measurements, not eyeballing) specifically at the tablet range (768–1024px) where this column is narrowest relative to its content.
- **Recommended direction:** Verify at 768px/834px (iPad portrait/landscape breakpoints) whether cover art remains legible, or whether Steam should stack vertically before the rest of the grid reflows.

### R3 — Low: Touch target sizing is good but inconsistently applied to one control

- **File:** `packages/widgets/github/src/heatmap.tsx:109-114`
- **Why it matters:** Nearly every interactive control in the app is deliberately sized `min-h-11`/`h-11 w-11` (44×44px, matching `docs/DECISIONS.md`'s accessibility pass) — but each heatmap day cell is a `<button>` sized to `cellSize` (capped at 11px). On mobile, that's a ~11×11px tap target for 350+ individual buttons packed into one card, dramatically below the 44×44px minimum every other control in the app respects.
- **Why it matters more specifically:** This is the single biggest touch-target outlier in an otherwise carefully-touch-optimized app. It's a deliberate trade-off (matching GitHub's own visual density), but it means the one widget with the *most* individual tap targets is also the one with the smallest, on the platform (mobile) where fat-finger mis-taps are most likely.
- **Recommended direction:** Not a full redesign — but consider whether day-cell detail (currently a `title` tooltip + click-to-toggle popover, see ER-adjacent A3 below) should be accessible some other way on touch (e.g. a "view details" affordance elsewhere, since tapping a specific ~11px cell accurately on a phone is genuinely hard), rather than relying on precise per-cell taps at all on small screens.

---

## Visual consistency

### V1 — Low: Two different link-underline treatments for "external" vs "same-app" secondary links

- **Files:** `packages/widgets/notes/src/notes-card.tsx:33` (`hover:underline`), `apps/web/src/app/timeline/page.tsx:26-27` (`ROW_HOVER`, a background tint, no underline)
- **Why it matters:** Minor, but "View all →" (Notes) uses an underline-on-hover treatment nowhere else in the app uses, while Timeline's own row links use a background-tint hover instead. Neither is wrong, but the app doesn't have one consistent "this is a link" visual language — some links tint, some underline, some (ProfileMenu's `Link`s) do neither beyond a background tint matching menu-row hover.
- **Recommended direction:** Pick one secondary-link hover treatment (background tint matches the rest of the interactive-row language better, per `GLASS_CHIP`'s existing pattern) and apply it everywhere, including Notes' footer link.

### V2 — Medium: `SPRING_PRESS`'s hover-scale is applied to icon buttons but not to Steam's cover-art tiles or Notebook/Notes' "View all" links, with no obvious rule for which get it

- **Files:** `packages/ui/src/glass.ts:26-27` (definition), applied in `widget-menu.tsx`, `profile-menu.tsx`, `action-form.tsx`, but *not* in `steam/component.tsx`'s game tiles or the various "View all" footer links
- **Why it matters:** `docs/DESIGN_SYSTEM.md`'s own Motion section says `SPRING_PRESS` is for "small interactive elements (buttons, icon tiles) only, not whole cards" — a defensible rule — but Steam's game tiles are themselves a clickable "whole card"-ish target with no press feedback at all (no scale, no color shift on the tile itself, only the underlying `<a>`'s default nothing). The result: some clickable surfaces in the app give tactile feedback, others give none, and the dividing line (small chrome buttons get it, content tiles don't) isn't visually obvious to a user, only to someone reading the source.
- **Recommended direction:** Give Steam's game tiles *some* press/hover acknowledgment (even just the cover art's border darkening, matching `GLASS_HOVER`'s existing "you're over this" language for cards) so every clickable surface in the app gives feedback, even if the specific feedback style differs by surface type.

---

## Keyboard shortcuts

### K1 — High: The app has no keyboard shortcuts at all, and no way to discover any

- **Finding:** A full-repo search for shortcut-handling patterns (global `keydown` listeners beyond Escape-to-close in `use-dismissable-menu.ts` and `modal.tsx`) found none. There's no "press `r` to refresh," no `cmd+k` command palette, no arrow-key navigation between widgets or list rows.
- **Why it matters:** For a "personal operating system" a power user opens daily, the complete absence of any keyboard-driven workflow is a real gap versus the Apple-first-party bar (Mail's `cmd+n`, Reminders' `cmd+n`/`space` to complete, Music's playback shortcuts). Right now every interaction — refresh, add a task, open notes — requires a mouse/touch click, even though the underlying actions (`refreshAllWidgetsAction`, `addTaskAction`) are already simple, single-purpose server actions that a shortcut could trigger just as easily as a click.
- **Recommended direction:** Even a small set — `r` for refresh-all (mirroring the logo-tap gesture), `n` to open the new-note modal, `Esc` already closes modals/menus — would meaningfully close this gap. Full command-palette-style discoverability (a `?`-triggered shortcut list) would be the "feels premium" version, not required for baseline correctness.

### K2 — Medium: Tab order through the dashboard is unannounced and untested

- **Finding:** No `skip to content` link, no landmark-based fast navigation beyond what `<section aria-labelledby>` (`widget-card.tsx:65`) already provides implicitly to screen readers. A sighted keyboard user tabbing through the dashboard has to pass through every widget's header icon badge (not focusable, fine), title (not focusable, fine), tag (not focusable, fine), and `WidgetMenu` trigger sequentially, widget by widget, with no way to jump.
- **Recommended direction:** A "Skip to main content" link (standard, cheap, and directly serves the keyboard-navigation principle `docs/DESIGN_SYSTEM.md`'s Accessibility section already commits to) would be a fast, high-value addition.

---

## Accessibility

### A1 — Critical: No global `:focus-visible` style — most controls fall back to the browser default the design system explicitly forbids

- **Files:** `apps/web/src/app/globals.css` (no `:focus-visible` rule anywhere), vs. `docs/DESIGN_SYSTEM.md`'s explicit accessibility commitment: *"`:focus-visible` as a 2px solid accent-colored outline — never the browser default."*
- **What's actually implemented:** Only 5 files define their own local `focus-visible:` classes (`modal.tsx`, `add-task-form.tsx`, `note-modal.tsx`, `notes-card.tsx`, `notebook-input.tsx`) — and even those mostly do `focus-visible:outline-none` paired with a border-color change, not the "2px solid accent outline" the design system specifies. Every other interactive control in the app — `WidgetMenu`'s trigger, `ProfileMenu`'s avatar button, every `ActionForm` submit button, every heatmap day cell, every `TaskRow` checkbox/delete button — has **no explicit focus style at all** and relies on whatever the browser's UA stylesheet does by default.
- **Why it matters:** This is the single largest gap between what the design system *says* and what's actually built, and it's a real accessibility regression, not just a style nit — a keyboard user tabbing through the dashboard gets an inconsistent, browser-default outline (thin blue in Chrome, different in Safari/Firefox) on most controls, contradicting the app's own stated a11y bar.
- **Recommended direction:** Add one global rule in `globals.css` — `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }` (or similar) — as the actual baseline the design doc describes, then audit the 5 files with local overrides to make sure they're not fighting it. This single CSS rule would fix the outlier controls (heatmap cells, menu triggers, checkboxes) app-wide at once.

### A2 — High: Heatmap day cells have no accessible name beyond a `title` attribute

- **File:** `packages/widgets/github/src/heatmap.tsx:109-114`
- **Code:**
  ```tsx
  <button
    type="button"
    onClick={() => toggle(day.date)}
    title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
    className={...}
  />
  ```
- **Why it matters:** `title` is not reliably announced by screen readers (support is inconsistent across VoiceOver/NVDA/JAWS, and it's never available at all on touch), and this button has no `aria-label`, no visible text, and no `aria-describedby`. A screen reader user tabbing onto one of these ~350 buttons hears essentially nothing describing what it is or what pressing it does — a real functional gap, not a nice-to-have, in an otherwise carefully `aria-label`'d app (see `heatmap.tsx:104`'s own `aria-label="Contribution heatmap, {year}"` on the grid, which shows the intent was there for the *container* but missed the individual cells).
- **Recommended direction:** Add `aria-label={`${formatMonthDay(day.date)}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}` to each cell button, matching content already computed for the `title`.

### A3 — Medium: The day-popover's disclosure isn't announced to assistive tech

- **File:** `packages/widgets/github/src/heatmap.tsx:115-124`, `packages/widgets/github/src/use-day-popover.ts`
- **Why it matters:** The popover has `role="tooltip"` but nothing on the triggering `<button>` (no `aria-expanded`, no `aria-describedby` pointing at the popover's id) ties the two together for assistive tech — a screen reader user has no way to know the button they just activated opened additional content, or where that content is.
- **Recommended direction:** Wire `aria-expanded={openDate === day.date}` and `aria-describedby` (pointing at a stable id on the popover) onto each cell button when its popover is open.

### A4 — Low: Color is the only signal for GitHub's contribution levels

- **File:** `packages/widgets/github/src/heatmap.tsx:9-15` (`LEVEL_CLASSES`, five shades of the accent color)
- **Why it matters:** The visible `title`/tooltip does carry the count as text (good), but the *at-a-glance* legend ("Less" → "More", `heatmap.tsx:132-138`) is purely five color swatches with no pattern/texture difference — a low-vision or color-deficient user relying on the visual grid alone (rather than reading every individual tooltip) gets meaningfully less signal than a sighted user with typical color vision.
- **Recommended direction:** Low priority given the redundant text tooltip already exists; worth a contrast-ratio check between adjacent `--color-accent-*` steps (200/400/600/800) specifically for deuteranopia/protanopia simulation before considering this fully resolved.

---

## Discoverability

### D1 — Medium: Pull-to-refresh and the logo-tap refresh are the only ways to trigger a global refresh, and neither is obviously discoverable

- **File:** `apps/web/src/app/refresh-all-title.tsx:32-50` (doc comment: *"single-user app, per Ken's explicit request not to add a separate icon button"*)
- **Why it matters:** This is a deliberate, documented product decision, not an oversight — flagging only from a pure discoverability lens: a returning user (or anyone but the app's single owner) has no visual cue that the wordmark itself is a button. There's no icon, no affordance hint, nothing distinguishing it from a static logo except a hover-color change that, by definition, a first-time user won't have discovered yet. `title="Refresh all widgets"` provides a hover tooltip on desktop, but nothing communicates this on first mobile use, where hover doesn't exist.
- **Recommended direction:** Given this is an explicit, already-discussed decision (see `docs/DECISIONS.md`), not proposing an icon — but consider whether a one-time subtle affordance (e.g. the wordmark briefly pulsing/inviting a tap on first load, or a tiny `title`-equivalent visible hint on mobile) would help without violating "no separate icon button."

### D2 — Low: Widget settings are one level deep inside an overflow menu, with no visual cue that settings exist

- **File:** `packages/ui/src/widget-menu.tsx:79-88`
- **Why it matters:** `WidgetMenu`'s "⋯" trigger looks identical whether a widget has settings behind it or not (only Refresh is guaranteed) — a user has to open the menu on every widget once just to learn which ones are configurable (Steam is; GitHub/RSS may or may not be, not fully confirmed in this pass). Nothing signals "this widget has more to configure" from the closed state.
- **Recommended direction:** Low priority — acceptable current pattern (matches "one consistent action surface per widget" from the component's own doc comment) — but if settings usage data ever shows users struggle to find Steam's SteamID field, a small dot/badge on the "⋯" trigger for widgets with unset required settings would close that gap.

---

## Animation quality & timing

### AN1 — Medium: Every interactive control shares one 150ms duration regardless of what's animating

- **File:** `packages/ui/src/glass.ts:26-29` (`GLASS_HOVER`, `SPRING_PRESS` both `duration-150`), `packages/ui/src/widget-menu.tsx:66`, `profile-menu.tsx:72` (dropdown open/close, also `duration-150`)
- **Why it matters:** Apple's own motion guidance (and general animation craft) varies duration by the *distance* the animated property travels and the *size* of the affected surface — a small icon's hover-scale and a 200px-tall dropdown panel's open/close transition are different-scale movements that, in a highly considered system, usually get different timing (a panel opening typically wants slightly longer than a button press, e.g. 200-250ms, so it doesn't feel like it "snaps" into existence). Here, everything — button press, dropdown open, dropdown close, card border-hover — uses the identical 150ms, which is a reasonable single default but not a tuned system.
- **Recommended direction:** Consider a two-tier duration scale (e.g. 120-150ms for micro-interactions like button press/hover, 200-250ms for panel-scale transitions like `WidgetMenu`/`ProfileMenu` open/close) — a small change that would make larger surfaces feel less abrupt without slowing down the snappy button feedback.

### AN2 — Low: Dropdown open and close use the same easing/duration, but closing usually should feel faster

- **Files:** `packages/ui/src/widget-menu.tsx:66`, `profile-menu.tsx:72`
- **Why it matters:** A common refinement in premium UI (visible in iOS's own sheet presentations) is an asymmetric transition — opening eases out (starts fast, settles in) over slightly longer, closing is quicker/linear, since a user dismissing something wants it gone promptly while a user opening something benefits from a settling motion that helps them track where the new content appeared. Both directions currently share `transition-opacity duration-150` uniformly.
- **Recommended direction:** Optional polish, low priority — flagged as the kind of detail that separates "good" from "obsessively considered," matching this audit's brief to evaluate against Apple's own bar.

### AN3 — Low: `animate-pulse` skeletons and `animate-spin` refresh icons are the only two animated states in the app — no shared motion vocabulary connects loading → loaded

- **Files:** `packages/ui/src/skeleton.tsx:14`, `packages/ui/src/action-form.tsx:71`
- **Why it matters:** When a widget's skeleton resolves into real content, there's no transition between the two states (per L2, it's an instant swap) — the *only* animated moments in the whole loading lifecycle are the pulsing skeleton itself and a spinning refresh icon; the actual "arrival" of new content, which is arguably the most satisfying moment to animate well, has no motion treatment at all.
- **Recommended direction:** A subtle fade-in (150-200ms) for a widget's content on its first successful render after a skeleton would connect the loading and loaded states into one continuous motion, rather than two disconnected animated moments bookending a hard cut.

---

## Widget resizing

### W1 — Low (by design, flagged for completeness): Widgets have no user-facing resize/reorder capability

- **Finding:** No drag-and-drop, no resize handles, no per-user layout customization found anywhere in `apps/web/src/app/page.tsx` or `packages/ui`. Widget size (`sm`/`md`/`lg`/`hero`) is a static property each widget declares (`packages/sdk/src/widget.ts`), not something a user can change.
- **Why this isn't a defect:** `CLAUDE.md` explicitly rules this out for now ("Don't scaffold future features... the widget marketplace... ahead of need"), and a fixed, art-directed layout is consistent with the "considered, editorial page" philosophy (a well-set page isn't user-rearrangeable either). Flagging only because "widget resizing" was an explicit audit category — confirming its absence is deliberate, not overlooked, and that the current fixed-layout approach is actually *more* aligned with the stated design philosophy than a customizable grid would be.
- **Recommended direction:** No action — this is correctly out of scope per the project's own stated principles. If reconsidered later, it would be a scope decision requiring its own `docs/DECISIONS.md` entry, not a UX bug fix.

---

## Micro-interactions

### M1 — Medium: Task completion has no transition — a completed task just instantly changes style

- **File:** `packages/widgets/tasks/src/task-row.tsx:37-45`
- **Code:** `className={task.completed ? "text-[var(--color-neutral-400)] line-through" : "text-[var(--foreground)]"}`
- **Why it matters:** Checking off a task is one of the most emotionally satisfying micro-interactions in any productivity app (Things 3, Reminders, and Apple's own Reminders app all animate this moment — a checkmark draw, a brief highlight, sometimes a fade/reorder) — here it's a synchronous class-swap with no transition at all, not even a `transition-colors`. Combined with the server-action round trip (the checkbox is `disabled={isToggling}` while pending, `task-row.tsx:31`), there's a brief moment where the row is inert, then an instant, untransitioned style flip.
- **Recommended direction:** Add `transition-colors duration-150` (matching the app's existing standard duration) to the row's text style at minimum; consider a brief strikethrough-draw animation if it's worth the extra CSS for this specific, high-frequency interaction.

### M2 — Low: Delete has no confirmation or undo — instant, silent, and irreversible

- **Files:** `packages/widgets/tasks/src/task-row.tsx:46-56` (delete button), `packages/widgets/notes/src/note-modal.tsx` (assumed similar, not fully reviewed)
- **Why it matters:** A single tap on the trash icon deletes a task immediately with no confirmation and no undo affordance (no toast, no "Undo" snackbar). Apple's own apps almost never make destructive actions this casual for user-generated content — Reminders/Notes both offer either a confirmation or a readily-available undo. A single mis-tap (especially given the heatmap's touch-target issue in R3 shows tap precision is a known concern on this device class) permanently loses a task with zero recovery path.
- **Recommended direction:** A lightweight undo affordance (a transient toast with "Undo," even client-side-only for a few seconds before the delete action actually commits) would close this gap without adding a disruptive confirmation dialog to a low-stakes, high-frequency action.

### M3 — Low: The quote-cycling Hero interaction has no indication that clicking the quote does anything, until you do it

- **File:** `packages/widgets/hero/src/quote-button.tsx` (referenced from `hero/src/component.tsx:58`)
- **Why it matters:** Not fully reviewed line-by-line in this pass, but flagged from `component.tsx`'s framing — the quote is rendered as a plain italic sentence with a `Sparkles` icon only in the *non-interactive* fallback branch (`component.tsx:61-67`); worth confirming the interactive `QuoteButton` variant gives some passive visual cue (cursor, subtle hover state) that it's clickable, since quoted text doesn't read as an obvious tap target by default typographic convention.
- **Recommended direction:** Confirm `QuoteButton` has a hover/focus treatment signaling interactivity; if it's purely text with a `cursor-pointer` and nothing else, consider the same faint border/underline-on-hover language used elsewhere for secondary interactive text.

---

## Hover states

### H1 — Low: Card-level hover (`GLASS_HOVER`) and button-level hover (`SPRING_PRESS`) can both fire on the same click, creating a slightly busy compound state

- **Files:** `packages/ui/src/glass.ts:22-29`, `packages/ui/src/card-shell.ts:38` (cards get `GLASS_HOVER` via `hover: true`), buttons inside those cards independently get `SPRING_PRESS`
- **Why it matters:** Hovering `WidgetMenu`'s trigger inside a `WidgetCard` triggers two simultaneous hover treatments — the card's border darkening to accent color (`GLASS_HOVER`) *and* the button's own scale-up (`SPRING_PRESS`), each on its own 150ms transition. Individually each is calm and restrained (matching the design system's stated goal), but layered they add up to more simultaneous motion than either alone, right at the moment a user is trying to focus on a small, precise target (a 44px button inside a card).
- **Recommended direction:** Minor — worth a visual check on whether the compound effect reads as "considered" or "busy" in practice; if the latter, consider whether card-level hover should suppress/dim when a specific interactive child is being hovered (via `:has()` or similar), so only one hover cue is visually dominant at a time.

---

## Focus states

(See **A1**, the critical finding above, for the primary focus-state gap — most controls have no defined focus-visible treatment at all. Additional notes below.)

### F1 — Low: Focus order inside `WidgetMenu`'s expanding "Settings" `<details>` isn't managed

- **File:** `packages/ui/src/widget-menu.tsx:79-88`
- **Why it matters:** `<details>/<summary>` is a good, native, keyboard-accessible disclosure choice (correctly noted in the component's own doc comment as deliberate). But opening it via keyboard (Enter/Space on the summary) doesn't move focus into the newly-revealed form — a keyboard user has to know to Tab again rather than the disclosure managing focus for them, which is a small but real friction point compared to what a fully-considered disclosure pattern would do.
- **Recommended direction:** Optional — native `<details>` behavior is a defensible baseline; only worth revisiting if real keyboard-user testing shows this specific gap causes confusion.

---

## Gesture support

### G1 — Low: Pull-to-refresh is the only custom gesture in the app — no swipe-to-delete/complete on list rows

- **File:** `packages/ui/src/use-pull-to-refresh.ts` (well-built — see the performance audit's L2 for its passive-listener correctness)
- **Why it matters:** Task/Note rows support only tap targets (checkbox, delete button) — no swipe gestures, which is the default mobile-list interaction pattern users expect from Apple's own Mail/Reminders/Messages (swipe-to-complete, swipe-to-delete). Given Pulse already has one well-implemented custom touch gesture (pull-to-refresh), the *absence* of the more expected list-row gestures stands out more, not less — it signals gesture support exists somewhere in the app, just not where users are most likely to reach for it first.
- **Recommended direction:** Consider swipe-to-complete on `TaskRow` and swipe-to-delete on Task/Note rows as a follow-up — high perceived-quality payoff on mobile specifically, and the existing `use-pull-to-refresh.ts` hook demonstrates the team already has the touch-event handling pattern established to build from.

### G2 — Low: No haptic-equivalent feedback signal for successful actions on touch devices

- **Finding:** No use of the Vibration API or any other touch-feedback signal found anywhere in the codebase (reasonable — this is a PWA, not a native app, and haptics require explicit, deliberate use). Flagged only because task-completion (M1) and refresh-completion are exactly the kind of "did that work?" moments where even a web app can use `navigator.vibrate()` (widely supported on Android Chrome, though not iOS Safari) as a cheap confidence signal.
- **Recommended direction:** Very low priority, partial-platform-support caveat noted — worth considering only after the visual micro-interaction gaps (M1, M2) are addressed, since those apply on every platform.

---

## Priority summary — what would move Pulse furthest toward "feels premium"

If only a handful of these are pursued, in order of impact-to-effort:

1. **A1** — one global `:focus-visible` CSS rule fixes the largest gap between the design system's stated a11y bar and reality, across the whole app at once.
2. **N1** — swapping `<a>` → `<Link>` on four files removes the single most jarring "this doesn't feel like one app" moment (dashboard → detail navigation).
3. **L1** — `loading.tsx` per route gives every navigation instant visual acknowledgment, directly addressing the reported "delay before interaction" symptom from a pure perceived-feedback angle (independent of the raw latency fixes in `PERFORMANCE_AUDIT.md`).
4. **A2** — a one-line `aria-label` fix on heatmap cells closes the app's most significant screen-reader gap.
5. **M1** — a single `transition-colors` class turns the app's highest-frequency interaction (checking off a task) from an instant flip into a considered moment.
6. **N3** — deleting one dead menu row removes the one visible "unfinished" signal in an otherwise polished account menu.

Everything else in this document is real but smaller in scope — worth addressing, but these six are where "feature-heavy" most visibly tips into "premium."
