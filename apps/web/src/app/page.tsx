import { Suspense } from "react";
import { getAllWidgets, type Widget } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { Skeleton, SPRING_PRESS, WidgetErrorBoundary } from "@pulse/ui";
import { auth, signIn } from "@/auth";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import { ProfileMenu } from "./profile-menu";
import "@/lib/register-widgets";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-screen overflow-x-hidden bg-[var(--background)]">
      <div className="relative flex min-h-screen flex-1 flex-col">
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
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--color-divider)] bg-[var(--background)] px-4 py-3 sm:px-6">
      <h1 className="font-heading text-lg font-semibold tracking-tight text-[var(--foreground)]">
        Pulse
      </h1>

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
 * one shared CSS Grid: "lg" widgets (currently just GitHub) in a wide
 * left column, everything else in a narrower right column. This isn't
 * how it started — a single `grid-cols-3` with GitHub spanning 2 columns
 * left the remaining single-column widgets sharing GitHub's grid row,
 * and CSS Grid sizes a row's height to its tallest cell regardless of
 * `align-items` — so whenever a shorter widget (e.g. Quick Launch) sat
 * in the same row as a taller one (Steam, once it grew stacked cover
 * art), the shorter cell's card was fine, but the row underneath it sat
 * empty. That's not a hover/hydration bug, it's how CSS Grid tracks
 * work — confirmed by reproducing it at multiple widths (desktop through
 * iPad portrait) during the responsive sweep, not guessed at. Two
 * independent flex columns don't have shared row tracks, so each one's
 * cards simply stack tight regardless of what's in the other column.
 * Assumes at least one "lg" widget exists to anchor the left column —
 * true today (GitHub) and not worth generalizing further until it isn't.
 */
function WidgetGrid({ userId }: { userId: string }) {
  const widgets = getAllWidgets();

  const heroWidgets = widgets.filter((widget) => widget.size === "hero");
  const wideWidgets = widgets.filter((widget) => widget.size === "lg");
  const railWidgets = widgets.filter(
    (widget) => widget.size !== "hero" && widget.size !== "lg",
  );

  return (
    <>
      {heroWidgets.map((widget) => (
        <WidgetErrorBoundary key={widget.id} name={widget.name}>
          <Suspense fallback={<Skeleton variant="hero" />}>
            <WidgetSlot widget={widget} userId={userId} />
          </Suspense>
        </WidgetErrorBoundary>
      ))}
      <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row">
        <div className="flex min-w-0 w-full flex-col gap-4 sm:basis-2/3">
          {wideWidgets.map((widget) => (
            <WidgetCell key={widget.id} widget={widget} userId={userId} />
          ))}
        </div>
        <div className="flex min-w-0 w-full flex-col gap-4 sm:basis-1/3">
          {railWidgets.map((widget) => (
            <WidgetCell key={widget.id} widget={widget} userId={userId} />
          ))}
        </div>
      </div>
    </>
  );
}
