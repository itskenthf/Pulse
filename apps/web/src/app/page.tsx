import { Suspense } from "react";
import { BookOpen, ListChecks, Rss } from "lucide-react";
import { getAllWidgets, type Widget, type WidgetAction } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { Skeleton, SPRING_PRESS, WidgetCard, WidgetErrorBoundary } from "@pulse/ui";
import { HERO_WIDGET_ID } from "@pulse/widget-hero";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { NOTEBOOK_WIDGET_ID } from "@pulse/widget-notebook";
import { WIDGET_ID as SPOTIFY_WIDGET_ID } from "@pulse/widget-spotify";
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
 * other widget flows into one real CSS Grid
 * (`repeat(auto-fit, minmax(320px, 1fr))`) — the browser decides column
 * count and reflow natively, so there's no JS weight-balancing heuristic
 * to keep in sync as widgets are added/removed (see docs/DECISIONS.md
 * for the rebuild that replaced the old two-flex-column
 * `balanceColumns` split). Visual priority is now just DOM order: Tasks,
 * Notes, and Notebook — Ken's own daily-input widgets — render first,
 * followed by GitHub, the Steam+Spotify pair, then the "coming soon"
 * placeholders last.
 *
 * `lg`-sized widgets (GitHub, Notebook) span two grid tracks on wide
 * widths via `lg:col-span-2`; on a single-column mobile width the span
 * naturally clamps to the one available track.
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

  const PRIORITY_ORDER = [TASKS_WIDGET_ID, NOTES_WIDGET_ID, NOTEBOOK_WIDGET_ID];
  const priorityWidgets = PRIORITY_ORDER.map((id) =>
    nonHeroWidgets.find((widget) => widget.id === id),
  ).filter((widget): widget is Widget => Boolean(widget));

  // Steam and Spotify are both small, glanceable widgets that only used
  // a fraction of a grid track's width on their own, leaving the rest of
  // the card empty — paired into one side-by-side sub-grid instead. Each
  // stays a fully independent widget (its own WidgetCell/error boundary/
  // Suspense below); only their layout placement is combined. `items-start`
  // keeps each card sized to its own content instead of being stretched
  // to match its neighbor's height (CSS Grid's default `align-items:
  // stretch`, which fought "grow according to content" — see
  // docs/DECISIONS.md).
  const steamWidget = nonHeroWidgets.find((widget) => widget.id === STEAM_WIDGET_ID);
  const spotifyWidget = nonHeroWidgets.find((widget) => widget.id === SPOTIFY_WIDGET_ID);

  const excludedFromNormalFlow = new Set([...PRIORITY_ORDER, STEAM_WIDGET_ID, SPOTIFY_WIDGET_ID]);
  const remainingWidgets = nonHeroWidgets.filter((widget) => !excludedFromNormalFlow.has(widget.id));

  const LG_SPAN = "lg:col-span-2";

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
      <div className="mx-auto grid w-full max-w-6xl grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-5 px-4 pb-4 [grid-auto-flow:dense] sm:gap-6 sm:px-6 sm:pb-6">
        {priorityWidgets.map((widget) => (
          <div key={widget.id} className={widget.size === "lg" ? LG_SPAN : undefined}>
            <WidgetCell widget={widget} userId={userId} resetKey={resetKey} />
          </div>
        ))}
        {remainingWidgets.map((widget) => (
          <div key={widget.id} className={widget.size === "lg" ? LG_SPAN : undefined}>
            <WidgetCell widget={widget} userId={userId} resetKey={resetKey} />
          </div>
        ))}
        {steamWidget && spotifyWidget && (
          <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">
            <WidgetCell widget={steamWidget} userId={userId} resetKey={resetKey} />
            <WidgetCell widget={spotifyWidget} userId={userId} resetKey={resetKey} />
          </div>
        )}
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
        <div className="opacity-70">
          <WidgetCard
            title="RSS"
            icon={<Rss className="h-4 w-4" aria-hidden="true" />}
            tag={{ label: "Coming soon", variant: "neutral" }}
          >
            Latest posts from your favorite blogs — planned for a future
            release.
          </WidgetCard>
        </div>
      </div>
    </>
  );
}

