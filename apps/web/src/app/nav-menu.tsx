"use client";

import { MoreHorizontal } from "lucide-react";
import { glassClass, SPRING_PRESS, useDismissableMenu } from "@pulse/ui";

const NAV_LINKS = [
  { label: "Dashboard", active: true },
  { label: "Tasks", active: false },
  { label: "Notes", active: false },
  { label: "Settings", active: false },
] as const;

/**
 * Replaces the old always-visible nav-link row, which hid Tasks/Notes/
 * Settings below `sm:` and left only "Dashboard" reachable on mobile.
 * Same "•••" overflow pattern as WidgetMenu/ProfileMenu (via
 * useDismissableMenu) at every breakpoint, not just mobile, so the
 * header stays consistent regardless of screen size. Account/sign-out
 * stays in ProfileMenu — this menu is page navigation only, not a
 * second place to sign out.
 */
export function NavMenu() {
  const { open, setOpen, rootRef, triggerRef } = useDismissableMenu<
    HTMLDivElement,
    HTMLButtonElement
  >();

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Navigation"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-current hover:bg-current/10 ${SPRING_PRESS}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        // See WidgetMenu for why `inert` and why the scale transform is
        // `motion-safe:`-gated.
        inert={!open}
        className={`absolute left-0 z-20 mt-2 w-48 origin-top-left overflow-hidden ${glassClass("heavy")} rounded-[4px] py-1 transition-opacity duration-150 motion-safe:transition-[transform,opacity] ${
          open
            ? "visible opacity-100 motion-safe:scale-100"
            : "invisible opacity-0 motion-safe:scale-95"
        }`}
      >
        {NAV_LINKS.map((link) =>
          link.active ? (
            <span
              key={link.label}
              aria-current="page"
              className="flex min-h-11 items-center px-3 py-2 text-sm font-medium text-[var(--color-accent)]"
            >
              {link.label}
            </span>
          ) : (
            <span
              key={link.label}
              title="Coming soon"
              className="flex min-h-11 items-center px-3 py-2 text-sm text-[var(--color-neutral-400)]"
            >
              {link.label}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
