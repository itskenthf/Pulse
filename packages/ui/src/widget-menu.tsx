import { MoreHorizontal, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import type { ReactNode } from "react";
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
 * Closes on outside click via CSS `:focus-within` on the wrapper, not a
 * checkbox + fixed backdrop: WidgetCard's own backdrop-blur establishes a
 * new containing block for `position: fixed` descendants (a real, easy to
 * miss CSS quirk — see docs/DECISIONS.md), so a backdrop nested inside a
 * glass card only ever covers the card's own box, not the viewport. A
 * plain `<button>` + `group-focus-within:` sidesteps that entirely: click
 * elsewhere moves focus out of the group and the menu hides on its own.
 */
export function WidgetMenu({ id, actions, settingsFields }: WidgetMenuProps) {
  return (
    <div className="group/menu relative inline-block" data-widget-menu={id}>
      <button
        type="button"
        aria-label="Widget actions"
        className={`flex h-8 w-8 items-center justify-center rounded-full text-current hover:bg-current/10 ${SPRING_PRESS}`}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      <div
        className={`invisible absolute right-0 z-20 mt-2 w-48 origin-top-right scale-95 rounded-2xl py-1 opacity-0 transition motion-safe:duration-150 group-focus-within/menu:visible group-focus-within/menu:scale-100 group-focus-within/menu:opacity-100 ${glassClass("heavy")}`}
      >
        <ActionForm
          action={actions.refresh}
          submitLabel="Refresh"
          variant="menu"
          icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
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
