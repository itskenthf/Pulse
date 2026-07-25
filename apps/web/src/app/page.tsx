import type { ReactNode } from "react";
import { Bell, LayoutDashboard, ListChecks, LogOut, Menu, Repeat2, Search, Settings } from "lucide-react";
import { getAllWidgets, type WidgetSize } from "@pulse/sdk";
import { readWidgetCache, readWidgetSettings } from "@pulse/database";
import { glassClass, SPRING_PRESS } from "@pulse/ui";
import { auth, signIn, signOut } from "@/auth";
import { refreshWidgetAction, updateWidgetSettingsAction } from "./actions/widgets";
import "@/lib/register-widgets";

const DRAWER_ID = "nav-drawer";

export default async function Home() {
  const session = await auth();

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-sky-200 via-cyan-100 to-violet-200 dark:from-slate-950 dark:via-blue-950 dark:to-violet-950">

      {session?.user && (
        <>
          {/* Checkbox-driven drawer toggle — no client JS needed. Must be a
              sibling ahead of anything using peer-checked below. */}
          <input type="checkbox" id={DRAWER_ID} className="peer hidden" />
          <label
            htmlFor={DRAWER_ID}
            aria-hidden="true"
            className="fixed inset-0 z-30 hidden bg-zinc-950/20 backdrop-blur-sm peer-checked:sm:block lg:hidden"
          />
          <Sidebar />
        </>
      )}

      <div className="relative flex min-h-screen flex-1 flex-col">
        <Navbar session={session} />

        <main className="flex flex-1 flex-col gap-6 p-4 pb-24 sm:p-6 sm:pb-6 lg:pb-28">
          {session?.user?.id ? (
            <WidgetGrid userId={session.user.id} />
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Sign in to see your dashboard.
            </p>
          )}
        </main>
      </div>

      {session?.user && <BottomNav />}
      {session?.user && <Dock />}
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
      <div className="flex items-center gap-3">
        {session?.user && (
          <label
            htmlFor={DRAWER_ID}
            className={`hidden h-8 w-8 cursor-pointer items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-950/5 sm:flex lg:hidden dark:text-zinc-400 dark:hover:bg-white/5 ${SPRING_PRESS}`}
            aria-label="Toggle navigation"
          >
            <Menu className="h-4.5 w-4.5" aria-hidden="true" />
          </label>
        )}
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Pulse
        </h1>
      </div>

      {session?.user ? (
        <div className="flex items-center gap-1.5">
          <NavIconButton label="Search — coming soon" disabled>
            <Search className="h-4 w-4" aria-hidden="true" />
          </NavIconButton>
          <NavIconButton label="Notifications — coming soon" disabled>
            <Bell className="h-4 w-4" aria-hidden="true" />
          </NavIconButton>
          <ProfileMenu user={session.user} />
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
            className={`rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 ${SPRING_PRESS}`}
          >
            Sign in with GitHub
          </button>
        </form>
      )}
    </header>
  );
}

function NavIconButton({
  label,
  disabled,
  children,
}: {
  label: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
        disabled
          ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
          : `text-zinc-500 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:bg-white/5 ${SPRING_PRESS}`
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Adaptive per breakpoint, not just resized: hidden below `sm` (BottomNav
 * takes over) and at `lg`+ (Dock takes over) — this is specifically the
 * tablet-range off-canvas drawer, toggled by the navbar's Menu button.
 * Only "Dashboard" is real — Tasks and Habits are visible, disabled
 * placeholders for future sections, not routed anywhere; UI signposting,
 * not scaffolded feature infrastructure.
 */
function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-y-0 left-0 z-40 hidden w-64 -translate-x-full flex-col gap-8 p-4 transition-transform duration-300 peer-checked:translate-x-0 sm:flex lg:hidden ${glassClass("medium")}`}
    >
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">
          P
        </span>
        <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Pulse</span>
      </div>

      <div className="flex flex-col gap-2">
        <SidebarLink label="Dashboard" active>
          <LayoutDashboard className="h-[18px] w-[18px]" aria-hidden="true" />
        </SidebarLink>
        <SidebarLink label="Tasks — coming soon" disabled>
          <ListChecks className="h-[18px] w-[18px]" aria-hidden="true" />
        </SidebarLink>
        <SidebarLink label="Habits — coming soon" disabled>
          <Repeat2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </SidebarLink>
      </div>
    </nav>
  );
}

function SidebarLink({
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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
        active
          ? "bg-sky-500/15 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
          : disabled
            ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
            : `text-zinc-500 hover:bg-zinc-950/5 dark:text-zinc-400 dark:hover:bg-white/5 ${SPRING_PRESS}`
      }`}
    >
      {children}
      <span>{label.replace(" — coming soon", "")}</span>
    </span>
  );
}

/**
 * Desktop-only (`lg`+) floating glass dock, replacing what was a
 * permanently pinned sidebar rail — bottom-center, inspired by desktop-OS
 * docks without copying one (rounded pill, glass material matching the
 * rest of Pulse, an active-state dot instead of a filled background).
 */
function Dock() {
  return (
    <nav
      aria-label="Primary"
      className={`fixed bottom-6 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-2 lg:flex ${glassClass("heavy")}`}
    >
      <DockIcon label="Dashboard" active>
        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
      </DockIcon>
      <DockIcon label="Tasks — coming soon" disabled>
        <ListChecks className="h-5 w-5" aria-hidden="true" />
      </DockIcon>
      <DockIcon label="Habits — coming soon" disabled>
        <Repeat2 className="h-5 w-5" aria-hidden="true" />
      </DockIcon>
    </nav>
  );
}

function DockIcon({
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
    <span title={label} aria-label={label} className="flex flex-col items-center gap-1 px-1.5">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full ${
          disabled
            ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
            : `text-zinc-600 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/10 ${SPRING_PRESS}`
        }`}
      >
        {children}
      </span>
      <span
        className={`h-1 w-1 rounded-full ${active ? "bg-sky-500 dark:bg-sky-400" : "bg-transparent"}`}
        aria-hidden="true"
      />
    </span>
  );
}

/** Phone-only ("glanceable companion") navigation — replaces the sidebar
 *  entirely below `sm` rather than shrinking it. */
function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className={`fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-2xl px-2 py-2 sm:hidden ${glassClass("heavy")}`}
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <BottomNavLink label="Dashboard" active>
        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
      </BottomNavLink>
      <BottomNavLink label="Tasks — coming soon" disabled>
        <ListChecks className="h-5 w-5" aria-hidden="true" />
      </BottomNavLink>
      <BottomNavLink label="Habits — coming soon" disabled>
        <Repeat2 className="h-5 w-5" aria-hidden="true" />
      </BottomNavLink>
    </nav>
  );
}

function BottomNavLink({
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
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${
        active
          ? "bg-sky-500/15 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
          : disabled
            ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
            : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * A real `<button>` + CSS `:focus-within` on the wrapper, not a checkbox +
 * fixed backdrop: Navbar's own backdrop-blur establishes a new containing
 * block for `position: fixed` descendants (a real CSS quirk — see
 * docs/DECISIONS.md), so a backdrop nested inside it only ever covers the
 * navbar's own box, not the viewport, and never catches an outside click.
 * `:focus-within` sidesteps that: click elsewhere moves focus out of the
 * group and the menu hides on its own, no backdrop element needed.
 */
function ProfileMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const label = user.name ?? user.email ?? "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="group/profile relative ml-1 inline-block">
      <button
        type="button"
        className={`flex cursor-pointer items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium text-zinc-950 dark:text-zinc-50 ${SPRING_PRESS}`}
      >
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
        <span className="hidden sm:inline">{label}</span>
      </button>

      <div
        className={`invisible absolute right-0 z-20 mt-2 w-48 origin-top-right scale-95 overflow-hidden rounded-2xl py-1 opacity-0 transition motion-safe:duration-150 group-focus-within/profile:visible group-focus-within/profile:scale-100 group-focus-within/profile:opacity-100 ${glassClass("heavy")}`}
      >
        <span
          title="Coming soon"
          className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
        >
          <Settings className="h-4 w-4" aria-hidden="true" /> Settings
        </span>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-950/5 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </form>
      </div>
    </div>
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
