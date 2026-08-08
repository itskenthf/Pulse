"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { glassClass, RADIUS, SPRING_PRESS, useDismissableMenu } from "@pulse/ui";
import { signOutAction } from "./actions/sign-out";

const NAV_LINKS = [
  { label: "Dashboard", active: true, href: undefined },
  { label: "Timeline", active: false, href: "/timeline" },
] as const;

/**
 * Single account menu — replaces what used to be two separate header
 * controls (a "•••" nav-links menu next to the "Pulse" title, and this
 * avatar dropdown with only Sign out). Merging them removes duplicate
 * navigation surfaces, all from one place. Tasks/Notes were dropped from
 * this list — both already have a "View all →" link on their own
 * dashboard card, so a second nav path here was redundant.
 *
 * Open/close state comes from `useDismissableMenu` (`@pulse/ui`) — the
 * same `pointerdown`-based dismissal, Escape-to-close, and focus-return
 * `WidgetMenu` uses, not CSS `:focus-within` (see that hook's doc
 * comment, or docs/DECISIONS.md, for why).
 */
export function ProfileMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const { open, setOpen, close, rootRef, triggerRef } = useDismissableMenu<
    HTMLDivElement,
    HTMLButtonElement
  >();
  const label = user.name ?? user.email ?? "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div ref={rootRef} className="relative ml-1 inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full ${SPRING_PRESS}`}
      >
        {user.image ? (
          // Plain <img>: external GitHub avatar URL, tiny fixed size — not
          // worth routing through next/image's optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            width={28}
            height={28}
            className="rounded-full border border-[var(--color-divider)]"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-accent-300)] bg-[var(--color-accent-100)] font-heading text-xs font-semibold text-[var(--color-accent-700)]">
            {initial}
          </span>
        )}
      </button>

      <div
        // See WidgetMenu for why `inert` (keeps a hidden panel out of tab
        // order) and why the scale transform is `motion-safe:`-gated.
        inert={!open}
        className={`absolute right-0 z-20 mt-2 w-56 origin-top-right overflow-hidden ${RADIUS.chip} py-1 transition-opacity duration-150 motion-safe:transition-[transform,opacity] ${
          open
            ? "visible opacity-100 motion-safe:scale-100"
            : "invisible opacity-0 motion-safe:scale-95"
        } ${glassClass("heavy")}`}
      >
        {/* Expands in place rather than linking to a separate page — a
         *  standalone /profile route rendered nothing beyond this same
         *  name/email, so showing it twice (once collapsed as "View
         *  Profile," once again on its own page) was pure duplication.
         *  Same <details>/<summary> disclosure WidgetMenu's own "Settings"
         *  row uses. */}
        <details>
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] [&::-webkit-details-marker]:hidden">
            <User className="h-4 w-4" aria-hidden="true" /> View Profile
          </summary>
          <div className="flex flex-col items-center gap-2 px-3 pt-1 pb-3 text-center">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                width={48}
                height={48}
                className="rounded-full border border-[var(--color-divider)]"
              />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-accent-300)] bg-[var(--color-accent-100)] font-heading text-lg font-semibold text-[var(--color-accent-700)]">
                {initial}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-[var(--foreground)]">
                {label}
              </span>
              {user.email && (
                <span className="truncate text-xs text-[var(--color-neutral-500)]">
                  {user.email}
                </span>
              )}
            </div>
          </div>
        </details>

        <div className="my-1 border-t border-[var(--color-divider)]" />

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
            <Link
              key={link.label}
              href={link.href}
              onClick={close}
              className="flex min-h-11 items-center px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
            >
              {link.label}
            </Link>
          ),
        )}

        <div className="my-1 border-t border-[var(--color-divider)]" />

        <form action={signOutAction} onSubmit={close}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
