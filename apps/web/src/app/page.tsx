import { Suspense, type ReactNode } from "react";
import { Book, BookOpen, CheckSquare, ListChecks, Rss } from "lucide-react";
import { getAllWidgets, type Widget, type WidgetSize } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { Skeleton, SPRING_PRESS, WidgetCard, WidgetErrorBoundary } from "@pulse/ui";
import { auth, signIn } from "@/auth";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import { NavMenu } from "./nav-menu";
import { ProfileMenu } from "./profile-menu";
import "@/lib/register-widgets";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)]">
      <Navbar session={session} />

      <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        {session?.user?.id ? (
          <WidgetGrid userId={session.user.id} />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
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
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--color-divider)] bg-[var(--background)] px-4 py-3 sm:px-6">
      <h1 className="font-heading text-lg font-semibold tracking-tight text-[var(--foreground)]">
        Pulse
      </h1>

      <NavMenu />

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
    readWidgetCache(userId, widget.id),
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
    },
  } as Parameters<typeof widget.render>[0];

  return <>{widget.render(props)}</>;
}

function WidgetCell({ widget, userId }: { widget: Widget; userId: string }) {
  return (
    <WidgetErrorBoundary name={widget.name}>
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
  const widgets = getAllWidgets();
  const heroWidgets = widgets.filter((widget) => widget.size === "hero");
  const nonHeroWidgets = widgets.filter((widget) => widget.size !== "hero");

  const items: ColumnItem[] = [
    ...nonHeroWidgets.map((widget) => ({
      weight: WIDGET_WEIGHT_OVERRIDE[widget.id] ?? WIDGET_WEIGHT[widget.size],
      node: <WidgetCell key={widget.id} widget={widget} userId={userId} />,
    })),
    {
      weight: WIDGET_WEIGHT.sm,
      node: (
        <div key="tasks-coming-soon" className="opacity-70">
          <WidgetCard
            title="Tasks"
            icon={<CheckSquare className="h-4 w-4" aria-hidden="true" />}
            tag={{ label: "Coming soon", variant: "neutral" }}
          >
            A dedicated task list — pulled from Todoist or Notion — is
            planned for a future release.
          </WidgetCard>
        </div>
      ),
    },
    {
      weight: WIDGET_WEIGHT.sm,
      node: (
        <div key="notes-coming-soon" className="opacity-70">
          <WidgetCard
            title="Notes"
            icon={<Book className="h-4 w-4" aria-hidden="true" />}
            tag={{ label: "Coming soon", variant: "neutral" }}
          >
            Quick daily notes and reminders — planned for a future release.
          </WidgetCard>
        </div>
      ),
    },
    {
      weight: WIDGET_WEIGHT.sm,
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
        <div className="-mx-4 border-b border-[var(--color-divider)] px-4 pb-6 sm:-mx-6 sm:px-6 sm:pb-8">
          {heroWidgets.map((widget) => (
            <WidgetErrorBoundary key={widget.id} name={widget.name}>
              <Suspense fallback={<Skeleton variant="hero" />}>
                <WidgetSlot widget={widget} userId={userId} />
              </Suspense>
            </WidgetErrorBoundary>
          ))}
        </div>
      )}
      <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:gap-6">
        <div className="flex min-w-0 w-full flex-col gap-5 sm:basis-2/3">{left}</div>
        <div className="flex min-w-0 w-full flex-col gap-5 sm:basis-1/3">{right}</div>
      </div>
    </>
  );
}

/** Rough relative height proxy per widget size, reusing the SDK's
 *  existing `size` field rather than a separate per-widget table. */
const WIDGET_WEIGHT: Record<WidgetSize, number> = { sm: 1, md: 2, lg: 3, hero: 0 };

/** Steam renders much taller than a typical "md" widget — two full
 *  16:9 cover-art tiles — so its `size` alone underestimates its real
 *  height and left a visible gap under its column-mate. Confirmed by
 *  screenshot, not guessed; see docs/DECISIONS.md. */
const WIDGET_WEIGHT_OVERRIDE: Record<string, number> = { steam: WIDGET_WEIGHT.lg };

interface ColumnItem {
  weight: number;
  node: ReactNode;
}

/** Greedily assigns each item to whichever column currently has the
 *  lower running weight, so the two independent flex columns end up
 *  close in total height instead of one being arbitrarily starved (see
 *  the WidgetGrid doc comment above). Ties go left, so the heaviest/
 *  first item (GitHub) anchors the wide column same as before. */
function balanceColumns(items: ColumnItem[]): { left: ReactNode[]; right: ReactNode[] } {
  const left: ReactNode[] = [];
  const right: ReactNode[] = [];
  let leftWeight = 0;
  let rightWeight = 0;

  for (const item of items) {
    if (leftWeight <= rightWeight) {
      left.push(item.node);
      leftWeight += item.weight;
    } else {
      right.push(item.node);
      rightWeight += item.weight;
    }
  }

  return { left, right };
}
