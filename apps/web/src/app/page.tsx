import { getAllWidgets, type WidgetSize } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { glassClass, SPRING_PRESS } from "@pulse/ui";
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

async function WidgetGrid({ userId }: { userId: string }) {
  const widgets = getAllWidgets();

  const rendered = await Promise.all(
    widgets.map(async (widget) => {
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

      return { id: widget.id, size: widget.size, node: widget.render(props) };
    }),
  );

  // "hero" renders full-width, chromeless, above the grid. Every other
  // widget flows into a bento-style grid — its `size` (sm/md/lg) picks how
  // many columns it spans, so the richest widget (GitHub, "lg") becomes an
  // actual focal point instead of every card getting equal width.
  const heroItems = rendered.filter((item) => item.size === "hero");
  const cardItems = rendered.filter((item) => item.size !== "hero");

  return (
    <>
      {heroItems.map((item) => (
        <div key={item.id}>{item.node}</div>
      ))}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cardItems.map((item) => (
          <div key={item.id} className={SPAN_CLASS[item.size as Exclude<WidgetSize, "hero">]}>
            {item.node}
          </div>
        ))}
      </div>
    </>
  );
}
