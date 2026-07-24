import { getAllWidgets } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { auth, signIn, signOut } from "@/auth";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import "@/lib/register-widgets";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col gap-6 bg-gradient-to-br from-sky-50 via-blue-50 to-white p-4 sm:p-6 dark:from-slate-950 dark:via-blue-950 dark:to-slate-950">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Pulse
        </h1>

        {session?.user ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Signed in as {session.user.name ?? session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("github");
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Sign in with GitHub
            </button>
          </form>
        )}
      </header>

      {session?.user?.id ? (
        <WidgetGrid userId={session.user.id} />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to see your dashboard.
        </p>
      )}
    </div>
  );
}

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

  // "hero" widgets render full-width, chromeless, above the card grid —
  // every other size renders inside the responsive grid as a WidgetCard.
  const heroItems = rendered.filter((item) => item.size === "hero");
  const cardItems = rendered.filter((item) => item.size !== "hero");

  return (
    <div className="flex flex-col gap-6">
      {heroItems.map((item) => (
        <div key={item.id}>{item.node}</div>
      ))}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cardItems.map((item) => (
          <div key={item.id}>{item.node}</div>
        ))}
      </div>
    </div>
  );
}
