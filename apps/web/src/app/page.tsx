import { Suspense } from "react";
import { getAllWidgets, type Widget, type WidgetSize } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { glassClass, Skeleton, SPRING_PRESS, WidgetErrorBoundary } from "@pulse/ui";
import { auth, signIn } from "@/auth";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import { ProfileMenu } from "./profile-menu";
import "@/lib/register-widgets";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-sky-200 via-cyan-100 to-violet-200 dark:from-slate-950 dark:via-blue-950 dark:to-violet-950">
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
    <header
      className={`sticky top-0 z-20 mx-4 mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 sm:mx-6 sm:mt-6 ${glassClass("medium")}`}
    >
      <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
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
            className={`rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 ${SPRING_PRESS}`}
          >
            Sign in with GitHub
          </button>
        </form>
      )}
    </header>
  );
}

const SPAN_CLASS: Record<Exclude<WidgetSize, "hero">, string> = {
  lg: "sm:col-span-2 lg:col-span-2",
  md: "col-span-1",
  sm: "col-span-1",
};

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

function WidgetGrid({ userId }: { userId: string }) {
  const widgets = getAllWidgets();

  // "hero" renders full-width, chromeless, above the grid. Every other
  // widget flows into a bento-style grid — its `size` (sm/md/lg) picks how
  // many columns it spans, so the richest widget (GitHub, "lg") becomes an
  // actual focal point instead of every card getting equal width. Layout
  // (which bucket, which span) only depends on `widget.size`, known
  // synchronously from the registry — no need to await any widget's data
  // before the grid itself can render.
  const heroWidgets = widgets.filter((widget) => widget.size === "hero");
  const cardWidgets = widgets.filter((widget) => widget.size !== "hero");

  return (
    <>
      {heroWidgets.map((widget) => (
        <WidgetErrorBoundary key={widget.id} name={widget.name}>
          <Suspense fallback={<Skeleton variant="hero" />}>
            <WidgetSlot widget={widget} userId={userId} />
          </Suspense>
        </WidgetErrorBoundary>
      ))}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cardWidgets.map((widget) => (
          <div
            key={widget.id}
            className={SPAN_CLASS[widget.size as Exclude<WidgetSize, "hero">]}
          >
            <WidgetErrorBoundary name={widget.name}>
              <Suspense fallback={<Skeleton />}>
                <WidgetSlot widget={widget} userId={userId} />
              </Suspense>
            </WidgetErrorBoundary>
          </div>
        ))}
      </div>
    </>
  );
}
