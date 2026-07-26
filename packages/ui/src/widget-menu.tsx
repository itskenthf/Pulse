"use client";

import { MoreHorizontal, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { WidgetActions } from "@pulse/sdk";
import { ActionForm } from "./action-form";
import { glassClass, SPRING_PRESS } from "./glass";
import { RADIUS } from "./tokens";
import { useDismissableMenu } from "./use-dismissable-menu";

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
 * Open/close state comes from `useDismissableMenu` — see its own doc
 * comment for why it's `pointerdown`-based rather than CSS
 * `:focus-within`, and for the Escape/focus-return behavior.
 *
 * Deliberately not `role="menu"`/`role="menuitem"`: that ARIA pattern
 * expects a constrained set of menuitem children and implies arrow-key
 * navigation between them, and once "Settings" is expanded this panel
 * contains a real form with text inputs — not valid content for a strict
 * ARIA menu. This is a disclosure panel that looks like a dropdown, not
 * an application menu, so plain buttons/labels (already keyboard-
 * operable via Tab/Enter/Space) are the more correct choice, not a
 * shortcut. `aria-haspopup="true"` (not "menu") signals a generic popup
 * without promising a pattern this doesn't implement.
 */
export function WidgetMenu({ id, actions, settingsFields }: WidgetMenuProps) {
  const { open, setOpen, close, rootRef, triggerRef } = useDismissableMenu<
    HTMLDivElement,
    HTMLButtonElement
  >();

  return (
    <div ref={rootRef} className="relative inline-block" data-widget-menu={id}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Widget actions"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 w-11 items-center justify-center rounded-full text-current hover:bg-current/10 ${SPRING_PRESS}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        // `inert` when closed: without it, a hidden-but-still-in-DOM panel
        // (kept for the opacity/scale transition) stays tabbable, so a
        // keyboard user could Tab into invisible controls. `motion-safe:`
        // gates the scale transform specifically — under
        // prefers-reduced-motion the panel still fades, it just doesn't
        // also scale in/out.
        inert={!open}
        className={`absolute right-0 z-20 mt-2 w-48 origin-top-right overflow-hidden ${RADIUS.chip} py-1 transition-opacity duration-150 motion-safe:transition-[transform,opacity] ${
          open
            ? "visible opacity-100 motion-safe:scale-100"
            : "invisible opacity-0 motion-safe:scale-95"
        } ${glassClass("heavy")}`}
      >
        <ActionForm
          action={actions.refresh}
          submitLabel="Refresh"
          variant="menu"
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          onSubmitted={close}
        />
        {actions.updateSettings && settingsFields && (
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] [&::-webkit-details-marker]:hidden">
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
