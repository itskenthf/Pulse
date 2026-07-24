import type { ReactNode } from "react";
import { getAllWidgets } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { auth, signIn, signOut } from "@/auth";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import "@/lib/register-widgets";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white dark:from-slate-950 dark:via-blue-950 dark:to-slate-950">
      {session?.user && <Sidebar />}

      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
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
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 7 2 2 4-4" />
      <path d="M12 6h8" />
      <path d="m4 15 2 2 4-4" />
      <path d="M12 16h8" />
    </svg>
  );
}

function HabitsIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 2 21 6l-4 4" />
      <path d="M3 12v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22 3 18l4-4" />
      <path d="M21 12v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17 21 12l-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/**
 * Compact icon rail — placeholder for future sections (Tasks/Habits, per
 * Ken's request). Only "Dashboard" is real; the rest are visibly disabled,
 * not routed anywhere — this is UI chrome, not scaffolding actual feature
 * infrastructure ahead of need.
 */
function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-6 border-r border-white/60 bg-white/70 py-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/70"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">
        P
      </span>

      <div className="flex flex-col items-center gap-3">
        <SidebarIcon label="Dashboard" active>
          <DashboardIcon />
        </SidebarIcon>
        <SidebarIcon label="Tasks — coming soon" disabled>
          <TasksIcon />
        </SidebarIcon>
        <SidebarIcon label="Habits — coming soon" disabled>
          <HabitsIcon />
        </SidebarIcon>
      </div>
    </nav>
  );
}

function SidebarIcon({
  label,
  active,
  disabled,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg ${
        active
          ? "bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
          : disabled
            ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
            : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * A `<details>` dropdown, not a client component with useState — avatar +
 * name summary, Settings (placeholder) + Sign out inside, no extra JS.
 */
function ProfileMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const label = user.name ?? user.email ?? "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-zinc-200 bg-white/80 py-1 pr-3 pl-1 text-sm font-medium text-zinc-950 hover:bg-white [&::-webkit-details-marker]:hidden dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-50 dark:hover:bg-zinc-900">
        {user.image ? (
          // Plain <img>: external GitHub avatar URL, tiny fixed size — not
          // worth routing through next/image's optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" width={28} height={28} className="rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
            {initial}
          </span>
        )}
        {label}
      </summary>

      <div className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <span
          title="Coming soon"
          className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
        >
          <SettingsIcon /> Settings
        </span>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <SignOutIcon /> Sign out
          </button>
        </form>
      </div>
    </details>
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
  // every other size flows into the masonry-style column layout below.
  const heroItems = rendered.filter((item) => item.size === "hero");
  const cardItems = rendered.filter((item) => item.size !== "hero");

  return (
    <div className="flex flex-col gap-6">
      {heroItems.map((item) => (
        <div key={item.id}>{item.node}</div>
      ))}
      {/* CSS multi-column layout: cards pack tightly top-to-bottom per
          column instead of leaving gaps under short cards the way a
          uniform-row CSS grid would — the "masonry" feel without JS. */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {cardItems.map((item) => (
          <div key={item.id} className="mb-4 break-inside-avoid">
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
}
