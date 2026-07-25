"use client";

import { LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { glassClass, SPRING_PRESS } from "@pulse/ui";
import { signOutAction } from "./actions/sign-out";

/**
 * Open state is real React state toggled on click, closed via a
 * document-level `pointerdown` listener outside the menu — not CSS
 * `:focus-within`, which relies on a tap reliably moving DOM focus onto a
 * plain `<button>`. Mobile/iPad Safari doesn't always do that on tap, so
 * `:focus-within` silently made this menu unopenable on touch devices
 * (same root cause, same fix, as WidgetMenu — see docs/DECISIONS.md).
 */
export function ProfileMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = user.name ?? user.email ?? "Account";
  const initial = label.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative ml-1 inline-block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
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
        className={`absolute right-0 z-20 mt-2 w-48 origin-top-right overflow-hidden rounded-2xl py-1 transition motion-safe:duration-150 ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        } ${glassClass("heavy")}`}
      >
        <span
          title="Coming soon"
          className="flex cursor-not-allowed items-center gap-2 px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
        >
          <Settings className="h-4 w-4" aria-hidden="true" /> Settings
        </span>
        <form action={signOutAction}>
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
