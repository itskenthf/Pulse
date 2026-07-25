"use client";

import { MoreHorizontal, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { WidgetActions } from "@pulse/sdk";
import { ActionForm } from "./action-form";
import { glassClass, SPRING_PRESS } from "./glass";

export interface WidgetMenuProps {
  id: string;
  actions: WidgetActions;
  /** The widget's own <SettingsFormFields settings={...} /> — rendered
   *  inside a nested "Settings" disclosure only when both this and
   *  actions.updateSettings are present. */
  settingsFields?: ReactNode;
}

/**
 * The single "⋯" overflow menu every widget uses for Refresh/Settings,
 * replacing a bare icon-refresh button (and, for Steam/Quick Launch, a
 * separate below-card Settings toggle) — one consistent action surface
 * per widget, room for future actions without redesigning the card.
 *
 * Open state is real React state toggled on click, closed via a
 * document-level `pointerdown` listener outside the menu — not CSS
 * `:focus-within`, which relies on a tap reliably moving DOM focus onto a
 * plain `<button>`. Mobile/iPad Safari doesn't always do that on tap, so
 * `:focus-within` silently made the menu unopenable on touch devices.
 * `pointerdown` (not `click`) covers touch and mouse identically.
 */
export function WidgetMenu({ id, actions, settingsFields }: WidgetMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
    <div ref={rootRef} className="relative inline-block" data-widget-menu={id}>
      <button
        type="button"
        aria-label="Widget actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-8 w-8 items-center justify-center rounded-full text-current hover:bg-current/10 ${SPRING_PRESS}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        className={`absolute right-0 z-20 mt-2 w-48 origin-top-right overflow-hidden rounded-2xl py-1 transition motion-safe:duration-150 ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        } ${glassClass("heavy")}`}
      >
        <ActionForm
          action={actions.refresh}
          submitLabel="Refresh"
          variant="menu"
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onSubmitted={() => setOpen(false)}
        />
        {actions.updateSettings && settingsFields && (
          <details>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-950/5 [&::-webkit-details-marker]:hidden dark:text-zinc-300 dark:hover:bg-white/5">
              <SettingsIcon className="h-4 w-4" aria-hidden="true" /> Settings
            </summary>
            <ActionForm action={actions.updateSettings} submitLabel="Save" className="px-3 pb-2">
              {settingsFields}
            </ActionForm>
          </details>
        )}
      </div>
    </div>
  );
}
