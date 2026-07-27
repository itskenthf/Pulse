import { Suspense, type ReactNode } from "react";
import { BookOpen, ListChecks, Rss } from "lucide-react";
import { getAllWidgets, type Widget, type WidgetAction, type WidgetSize } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { Skeleton, SPRING_PRESS, WidgetCard, WidgetErrorBoundary } from "@pulse/ui";
import { HERO_WIDGET_ID } from "@pulse/widget-hero";
import { NOTES_WIDGET_ID } from "@pulse/widget-notes";
import { TASKS_WIDGET_ID } from "@pulse/widget-tasks";
import { auth, signIn } from "@/auth";
import { cycleHeroQuoteAction } from "./actions/hero";
import { addNoteAction, deleteNoteAction, updateNoteAction } from "./actions/notes";
import { addTaskAction, deleteTaskAction, toggleTaskAction } from "./actions/tasks";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import { ProfileMenu } from "./profile-menu";
import { RefreshAllTitle } from "./refresh-all-title";
import "@/lib/register-widgets";

/**
 * Per-widget custom actions (beyond the generic refresh/updateSettings
 * every widget gets) — Hero's quote cycling, Tasks' add/toggle/delete,
 * Notes' add/update/delete. See `Widget`/`WidgetRenderProps`'s `TActions`
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
};

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar session={session} />

      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {session?.user?.id ? (
          <WidgetGrid userId={session.user.id} />
        ) : (
          <p className="text-sm text-zinc-600">
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
 * other widget splits into two independently-stacked flows rather than
 * one shared CSS Grid — a single `grid-cols-3` with GitHub spanning 2
 * columns left the remaining single-column widgets sharing GitHub's grid
 * row, and CSS Grid sizes a row's height to its tallest cell regardless
 * of `align-items` — so whenever a shorter widget (e.g. Quick Launch) sat
 * in the same row as a taller one (Steam, once it grew stacked cover
 * art), the shorter cell's card was fine, but the row underneath it sat
 * empty. That's not a hover/hydration bug, it's how CSS Grid tracks
 * work — confirmed by reproducing it at multiple widths (desktop through
 * iPad portrait) during the responsive sweep, not guessed at. Two
 * independent flex columns don't have shared row tracks, so each one's
 * cards simply stack tight regardless of what's in the other column.
 *
 * Which widget lands in which column is decided by `balanceColumns`
 * below, not a hard "lg vs. everything else" split — that split left the
 * wide column (GitHub alone) far shorter than the rail once enough
 * widgets existed, reading as a large empty gap under GitHub instead of
 * two comparably-tall columns (see docs/DECISIONS.md).
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

  const items: ColumnItem[] = [
    ...nonHeroWidgets.map((widget) => ({
      weight: WIDGET_WEIGHT_OVERRIDE[widget.id] ?? WIDGET_WEIGHT[widget.size],
      node: (
        <WidgetCell key={widget.id} widget={widget} userId={userId} resetKey={resetKey} />
      ),
    })),
    {
      weight: WIDGET_WEIGHT.sm,
      placeholder: true,
      node: (
        <div key="habits-coming-soon" className="opacity-70">
          <WidgetCard
            title="Habits"
            icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
            tag={{ label: "Coming soon", variant: "neutral" }}
          >
            A daily checklist — water, exercise, reading, meditation — is
            planned for a future release.
          </WidgetCard>
        </div>
      ),
    },
    {
      weight: WIDGET_WEIGHT.sm,
      placeholder: true,
      node: (
        <div key="reading-coming-soon" className="opacity-70">
          <WidgetCard
            title="Reading"
            icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
            tag={{ label: "Coming soon", variant: "neutral" }}
          >
            Track your current book and reading streak — planned for a
            future release.
          </WidgetCard>
        </div>
      ),
    },
    {
      weight: WIDGET_WEIGHT.sm,
      placeholder: true,
      node: (
        <div key="rss-coming-soon" className="opacity-70">
          <WidgetCard
            title="RSS"
            icon={<Rss className="h-4 w-4" aria-hidden="true" />}
            tag={{ label: "Coming soon", variant: "neutral" }}
          >
            Latest posts from your favorite blogs — planned for a future
            release.
          </WidgetCard>
        </div>
      ),
    },
  ];
  const { left, right } = balanceColumns(items);

  return (
    <>
      {heroWidgets.length > 0 && (
        <div className="-mx-4 -mt-4 border-b border-[var(--color-divider)] px-4 pt-2 pb-2 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-3 sm:pb-3">
          {heroWidgets.map((widget) => (
            <WidgetErrorBoundary key={widget.id} name={widget.name} resetKey={resetKey}>
              <Suspense fallback={<Skeleton variant="hero" />}>
                <WidgetSlot widget={widget} userId={userId} />
              </Suspense>
            </WidgetErrorBoundary>
          ))}
        </div>
      )}
      <div className="flex min-w-0 flex-col items-stretch gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="contents sm:flex sm:min-w-0 sm:w-full sm:flex-col sm:gap-5 sm:basis-2/3">
          {left}
        </div>
        <div className="contents sm:flex sm:min-w-0 sm:w-full sm:flex-col sm:gap-5 sm:basis-1/3">
          {right}
        </div>
      </div>
    </>
  );
}

/** Rough relative height proxy per widget size, reusing the SDK's
 *  existing `size` field rather than a separate per-widget table. */
const WIDGET_WEIGHT: Record<WidgetSize, number> = { sm: 1, md: 2, lg: 3, hero: 0 };

/** No per-widget overrides today — Steam needed one when its cover art
 *  rendered as a tall single-column stack (see docs/DECISIONS.md,
 *  2026-07-25), but its 2-column grid (2026-07-27) brought its real
 *  height back in line with its "md" size, so the override was removed. */
const WIDGET_WEIGHT_OVERRIDE: Record<string, number> = {};

interface ColumnItem {
  weight: number;
  node: ReactNode;
  /** "Coming soon" cards with no real data yet — sorted below every
   *  data-bearing widget in the single-column mobile stack. */
  placeholder?: boolean;
}

/** Greedily assigns each item to whichever column currently has the
 *  lower running weight, so the two independent flex columns end up
 *  close in total height instead of one being arbitrarily starved (see
 *  the WidgetGrid doc comment above). Ties go left, so the heaviest/
 *  first item (GitHub) anchors the wide column same as before.
 *
 *  `items` arrives priority-sorted (real widgets first, "coming soon"
 *  placeholders last). Rather than greedily assigning each item to
 *  whichever column is currently lighter — which can freely interleave
 *  items across columns and scramble that priority order — this walks
 *  the list in order, filling `left` until its running weight crosses
 *  half the total, then sending everything else to `right`. Mobile
 *  collapses the two columns to one stack by rendering `left` fully
 *  before `right`, so this ordering is exactly what appears there: no
 *  CSS `order` trick needed, and the DOM order a keyboard/screen-reader
 *  user tabs through matches what's on screen at every breakpoint. */
function balanceColumns(items: ColumnItem[]): { left: ReactNode[]; right: ReactNode[] } {
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const half = totalWeight / 2;
  let leftWeight = 0;

  items.forEach((item, index) => {
    const node = <div key={index}>{item.node}</div>;

    if (leftWeight < half) {
      left.push(node);
      leftWeight += item.weight;
    } else {
      right.push(node);
    }
  });

  return { left, right };
}
