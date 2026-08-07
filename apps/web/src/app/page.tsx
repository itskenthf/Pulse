import { Suspense } from "react";
import { BookOpen, ListChecks } from "lucide-react";
import { getAllWidgets, type Widget, type WidgetAction } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { Skeleton, SPRING_PRESS, WidgetCard, WidgetErrorBoundary } from "@pulse/ui";
import { WIDGET_ID as GITHUB_WIDGET_ID } from "@pulse/widget-github";
import { HERO_WIDGET_ID } from "@pulse/widget-hero";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
import { WIDGET_ID as RSS_WIDGET_ID } from "@pulse/widget-rss";
import { WIDGET_ID as STEAM_WIDGET_ID } from "@pulse/widget-steam";
import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";
import { auth, signIn } from "@/auth";
import { cycleHeroQuoteAction } from "./actions/hero";
import { addNoteAction, deleteNoteAction, updateNoteAction } from "./actions/notes";
import { addEntryAction, updateEntryAction } from "./actions/notebook";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "./actions/tasks";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import { ProfileMenu } from "./profile-menu";
import { RefreshAllTitle } from "./refresh-all-title";
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
    readWidgetCache(userId, widget.id, widget.dataSchema),
    readWidgetSettings(userId, widget.id),
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
 * - Row 2+3: GitHub, a Steam+RSS side column, then Habits and Reading.
 *   GitHub spans 2 of 3 columns at `lg` so its edges align with Row 1's
 *   tracks. The side column spans both grid rows at `lg` (running the
 *   full height of GitHub plus the Habits/Reading row below it), with
 *   RSS stretching to fill any remaining height below Steam. Below `lg`
 *   there's no 3rd column, so these four items just auto-flow through
 *   the grid in DOM order.
 *
 * Spotify is intentionally not looked up/rendered here — see
 * docs/DECISIONS.md. It stays registered (so its cache still refreshes
 * on schedule) but no longer appears on the dashboard.
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

          <div className="opacity-70">
            <WidgetCard
              title="Habits"
              icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
              tag={{ label: "Coming soon", variant: "neutral" }}
            >
              A daily checklist — water, exercise, reading, meditation — is
              planned for a future release.
            </WidgetCard>
          </div>
          <div className="opacity-70">
            <WidgetCard
              title="Reading"
              icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
              tag={{ label: "Coming soon", variant: "neutral" }}
            >
              Track your current book and reading streak — planned for a
              future release.
            </WidgetCard>
          </div>
        </div>
      </div>
    </>
  );
}

