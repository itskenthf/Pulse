import { Suspense } from "react";
import { getAllWidgets, type Widget, type WidgetAction } from "@pulse/sdk";
import { Skeleton, SPRING_PRESS, WidgetErrorBoundary } from "@pulse/ui";
import { WIDGET_ID as GITHUB_WIDGET_ID } from "@pulse/widget-github";
import { HERO_WIDGET_ID } from "@pulse/widget-hero";
import { INSIGHTS_WIDGET_ID } from "@pulse/widget-insights";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
import { READING_WIDGET_ID } from "@pulse/widget-reading";
import { MEALS_WIDGET_ID } from "@pulse/widget-meals";
import { WIDGET_ID as RSS_WIDGET_ID } from "@pulse/widget-rss";
import { WIDGET_ID as STEAM_WIDGET_ID } from "@pulse/widget-steam";
import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";
import { WEEKLY_REVIEW_WIDGET_ID } from "@pulse/widget-weekly-review";
import { WEIGHT_WIDGET_ID } from "@pulse/widget-weight";
import { auth, signIn } from "@/auth";
import { cycleHeroQuoteAction } from "./actions/hero";
import { toggleMealAction } from "./actions/meals";
import { addNoteAction, deleteNoteAction, updateNoteAction } from "./actions/notes";
import { addEntryAction, updateEntryAction } from "./actions/notebook";
import {
  addBookAction,
  deleteBookAction,
  markFinishedAction,
  updateProgressAction,
} from "./actions/reading";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "./actions/tasks";
import { saveReviewAction } from "./actions/weekly-review";
import {
  createWeightGoalAction,
  deleteWeightLogAction,
  logWeightAction,
} from "./actions/weight";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import { ProfileMenu } from "./profile-menu";
import { RefreshAllTitle } from "./refresh-all-title";
import { readCachedWidgetCache, readCachedWidgetSettings } from "@/lib/widget-data-cache";
import "@/lib/register-widgets";

/**
 * Per-widget custom actions (beyond the generic refresh/updateSettings
 * every widget gets) — Hero's quote cycling, Tasks' add/toggle/delete,
 * Notes' add/update/delete, Notebook's autosave add/update. See
 * `Widget`/`WidgetRenderProps`'s `TActions`
 * generic in packages/sdk/src/widget.ts for why this is spread into the
 * base actions object rather than each widget growing the shared
 * `WidgetActions` interface directly.
 */
const CUSTOM_ACTIONS: Record<string, Record<string, WidgetAction>> = {
  [HERO_WIDGET_ID]: { cycleQuote: cycleHeroQuoteAction },
  [TASKS_WIDGET_ID]: {
    addTask: addTaskAction,
    toggleTask: toggleTaskAction,
    deleteTask: deleteTaskAction,
  },
  [NOTES_WIDGET_ID]: {
    addNote: addNoteAction,
    updateNote: updateNoteAction,
    deleteNote: deleteNoteAction,
  },
  [NOTEBOOK_WIDGET_ID]: {
    addEntry: addEntryAction,
    updateEntry: updateEntryAction,
  },
  [READING_WIDGET_ID]: {
    addBook: addBookAction,
    updateProgress: updateProgressAction,
    markFinished: markFinishedAction,
    deleteBook: deleteBookAction,
  },
  [WEIGHT_WIDGET_ID]: {
    logWeight: logWeightAction,
    deleteWeightLog: deleteWeightLogAction,
    createWeightGoal: createWeightGoalAction,
  },
  [MEALS_WIDGET_ID]: {
    toggleMeal: toggleMealAction,
  },
  [WEEKLY_REVIEW_WIDGET_ID]: {
    saveReview: saveReviewAction,
  },
};

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar session={session} />

      <main className="flex flex-1 flex-col gap-6">
        {session?.user?.id ? (
          <WidgetGrid userId={session.user.id} />
        ) : (
          <p className="p-4 text-sm text-zinc-600 sm:p-6">
            Sign in to see your dashboard.
          </p>
        )}
      </main>
    </div>
  );
}

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function Navbar({ session }: { session: { user?: SessionUser } | null }) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--color-divider)] bg-[var(--background)] px-4 py-2 sm:px-6">
      {session?.user ? (
        <RefreshAllTitle />
      ) : (
        <h1>
          {/* Local static asset at a small fixed size — next/image's
              overhead isn't warranted, same call as profile-menu.tsx's avatar. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-pulse.png"
            alt="Pulse"
            className="h-6 w-auto sm:h-7"
          />
        </h1>
      )}

      <div className="ml-auto flex items-center gap-3">
        {session?.user ? (
          <ProfileMenu user={session.user} />
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("github");
            }}
          >
            <button
              type="submit"
              className={`min-h-11 rounded-[4px] border border-[var(--color-accent)] px-4 py-2 font-heading text-sm font-semibold text-[var(--color-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] ${SPRING_PRESS}`}
            >
              Sign in with GitHub
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

/**
 * One widget's cache read + render. Deliberately has no try/catch of its
 * own — a plain try/catch here would only catch synchronous errors in
 * this function's own body, not errors thrown by `widget.render()`'s JSX
 * descendants during React's actual render phase (JSX elements are just
 * deferred descriptions until React renders them). Real isolation comes
 * from the WidgetErrorBoundary each call site wraps this in (see
 * WidgetGrid below), which Next.js's streaming SSR lets catch errors
 * thrown by this async Server Component itself, not just client-side
 * descendants.
 */
async function WidgetSlot({ widget, userId }: { widget: Widget; userId: string }) {
  const [cached, settings] = await Promise.all([
    readCachedWidgetCache(userId, widget.id, widget.refreshInterval, widget.dataSchema),
    readCachedWidgetSettings(userId, widget.id, widget.refreshInterval),
  ]);

  const resolvedSettings = settings ?? widget.settings?.() ?? {};

  // Every widget in this array was type-checked against the SDK
  // contract when it was authored — this cast just re-attaches that
  // widget's own generic types, which TypeScript can't track once
  // heterogeneous widgets share one array.
  const props = {
    data: cached?.data ?? null,
    settings: resolvedSettings,
    actions: {
      refresh: refreshWidgetAction.bind(null, widget.id),
      updateSettings: widget.parseSettingsForm
        ? updateWidgetSettingsAction.bind(null, widget.id)
        : undefined,
      ...CUSTOM_ACTIONS[widget.id],
    },
  } as Parameters<typeof widget.render>[0];

  return <>{widget.render(props)}</>;
}

function WidgetCell({
  widget,
  userId,
  resetKey,
}: {
  widget: Widget;
  userId: string;
  /** See WidgetErrorBoundary's own doc comment — a value that changes on
   *  every server-driven re-render, letting a previously-errored boundary
   *  give the widget's new data an actual fresh render attempt. */
  resetKey: unknown;
}) {
  return (
    <WidgetErrorBoundary name={widget.name} resetKey={resetKey}>
      <Suspense fallback={<Skeleton />}>
        <WidgetSlot widget={widget} userId={userId} />
      </Suspense>
    </WidgetErrorBoundary>
  );
}

/**
 * "hero" renders full-width, chromeless, above everything else. Every
 * other widget flows into two stacked, fixed-column CSS Grids (see
 * docs/DECISIONS.md's layout-regroup entry) — 1 column on mobile, 2 at
 * `sm`, 3 at `lg` — replacing the old single `auto-fit` grid:
 *
 * - Row 1: Tasks, Notes, Notebook (Ken's own daily-input widgets).
 *   Notebook (the 3rd item) spans both columns only at the `sm` (2-col)
 *   breakpoint, reverting to one track at `lg`.
 * - Row 2: a 2-col×2-row area (GitHub above Reading, both `lg:col-span-2`
 *   so their edges align with Row 1's tracks) beside a Steam+RSS side
 *   column that spans both grid rows at `lg` (running the full height of
 *   GitHub+Reading combined), RSS stretching to fill any remaining
 *   height below Steam. Reading's `<div>` comes after the side column's
 *   in DOM order specifically so CSS Grid's auto-placement lands it in
 *   row 2 under GitHub instead of stealing the side column's row-1 slot.
 *   Below `lg` there's no 3rd column, so these auto-flow through the
 *   grid in DOM order.
 *
 * Habits "Coming soon" placeholder card (Reading's real build is above)
 * was removed 2026-08-08 — see docs/DECISIONS.md's entry for why (unfinished
 * placeholders shown on every visit, no real logic behind them).
 *
 * Row 0 (Body & Health, docs/DECISIONS.md's Body & Health entry): Insights,
 * Weekly Review, Meals, Weight — directly under the hero banner, one
 * compact row instead of two stacked rows (collapsed 2026-08-13 to cut
 * the dead whitespace the two-row layout left below the fold — see
 * docs/DECISIONS.md's matching-dated entry). Ordered by how the eye
 * should land: observations (Insights) and the weekly rollup (Weekly
 * Review) first as narrow, near-square cards since their content is
 * mostly short text; Meals and Weight last, twice as wide (`lg:col-span-4`
 * vs `lg:col-span-2` of 12) since they carry the actual daily-input UI
 * (checklist, weigh-in field) and warrant the room. 2×2 at `sm`, single
 * column on mobile. Workout has no card here on purpose: it's a Phase 2
 * module with no real widget behind it yet, and this repo deliberately
 * doesn't ship placeholder cards for unbuilt features (see the Habits
 * removal above). Nutrition and Daily Digest were both removed entirely
 * 2026-08-13 by explicit request — see docs/DECISIONS.md's matching-dated
 * entry. Insights still reads `nutrition_logs`/`goals` directly
 * (unaffected by the widget's removal, same as Weight/Meals' own tables),
 * so nutrition goal-adherence observations keep working off whatever data
 * already exists.
 */
function WidgetGrid({ userId }: { userId: string }) {
  // See WidgetCell's own resetKey comment for why this is called here —
  // one value shared by every WidgetErrorBoundary in this render, hero
  // included. Deliberate impure call: this is a Server Component,
  // rendered exactly once per request/revalidation, not a Client
  // Component subject to React's concurrent multi-render re-invocation
  // (the actual risk the purity rule below guards against) — a value that
  // legitimately differs between separate server renders is the entire
  // point here, not an accidental side effect.
  // eslint-disable-next-line react-hooks/purity
  const resetKey = Date.now();
  const widgets = getAllWidgets();
  const heroWidgets = widgets.filter((widget) => widget.size === "hero");
  const nonHeroWidgets = widgets.filter((widget) => widget.size !== "hero");

  const tasksWidget = nonHeroWidgets.find((widget) => widget.id === TASKS_WIDGET_ID);
  const notesWidget = nonHeroWidgets.find((widget) => widget.id === NOTES_WIDGET_ID);
  const notebookWidget = nonHeroWidgets.find((widget) => widget.id === NOTEBOOK_WIDGET_ID);
  const githubWidget = nonHeroWidgets.find((widget) => widget.id === GITHUB_WIDGET_ID);
  const steamWidget = nonHeroWidgets.find((widget) => widget.id === STEAM_WIDGET_ID);
  const rssWidget = nonHeroWidgets.find((widget) => widget.id === RSS_WIDGET_ID);
  const readingWidget = nonHeroWidgets.find((widget) => widget.id === READING_WIDGET_ID);
  const weightWidget = nonHeroWidgets.find((widget) => widget.id === WEIGHT_WIDGET_ID);
  const mealsWidget = nonHeroWidgets.find((widget) => widget.id === MEALS_WIDGET_ID);
  const weeklyReviewWidget = nonHeroWidgets.find((widget) => widget.id === WEEKLY_REVIEW_WIDGET_ID);
  const insightsWidget = nonHeroWidgets.find((widget) => widget.id === INSIGHTS_WIDGET_ID);

  const rowHealthWidgets = [insightsWidget, weeklyReviewWidget, mealsWidget, weightWidget].filter(
    (widget): widget is Widget => Boolean(widget),
  );
  const WIDE_HEALTH_ROW_WIDGET_IDS: string[] = [MEALS_WIDGET_ID, WEIGHT_WIDGET_ID];
  const rowTopWidgets = [tasksWidget, notesWidget, notebookWidget].filter(
    (widget): widget is Widget => Boolean(widget),
  );

  const ROW_GRID = "grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3";

  return (
    <>
      {heroWidgets.length > 0 && (
        <div className="border-b border-[var(--color-divider)] px-4 pt-2 pb-2 sm:px-6 sm:pt-3 sm:pb-3">
          {heroWidgets.map((widget) => (
            <WidgetErrorBoundary key={widget.id} name={widget.name} resetKey={resetKey}>
              <Suspense fallback={<Skeleton variant="hero" />}>
                <WidgetSlot widget={widget} userId={userId} />
              </Suspense>
            </WidgetErrorBoundary>
          ))}
        </div>
      )}
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 pb-4 sm:gap-6 sm:px-6 sm:pb-6">
        {rowHealthWidgets.length > 0 && (
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-12">
            {rowHealthWidgets.map((widget) => (
              <div
                key={widget.id}
                className={WIDE_HEALTH_ROW_WIDGET_IDS.includes(widget.id) ? "lg:col-span-4" : "lg:col-span-2"}
              >
                <WidgetCell widget={widget} userId={userId} resetKey={resetKey} />
              </div>
            ))}
          </div>
        )}

        <div className={ROW_GRID}>
          {rowTopWidgets.map((widget, index) => (
            <div
              key={widget.id}
              className={index === rowTopWidgets.length - 1 ? "sm:col-span-2 lg:col-span-1" : undefined}
            >
              <WidgetCell widget={widget} userId={userId} resetKey={resetKey} />
            </div>
          ))}
        </div>

        <div className={ROW_GRID}>
          {githubWidget && (
            <div className="lg:col-span-2">
              <WidgetCell widget={githubWidget} userId={userId} resetKey={resetKey} />
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:row-span-2 lg:self-stretch">
            {steamWidget && <WidgetCell widget={steamWidget} userId={userId} resetKey={resetKey} />}
            {rssWidget && (
              <div className="lg:flex-1 lg:[&>*]:h-full">
                <WidgetCell widget={rssWidget} userId={userId} resetKey={resetKey} />
              </div>
            )}
          </div>

          {readingWidget && (
            <div className="lg:col-span-2">
              <WidgetCell widget={readingWidget} userId={userId} resetKey={resetKey} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

