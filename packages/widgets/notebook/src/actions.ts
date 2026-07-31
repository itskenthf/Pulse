import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Notebook-only actions — same per-widget extension pattern as Notes'
 *  `NoteWidgetActions` (see `packages/sdk/src/widget.ts`'s
 *  `Widget`/`WidgetRenderProps` `TActions` generic). No `deleteEntry`:
 *  v1 has no deletion of closed entries. */
export interface NotebookWidgetActions extends WidgetActions {
  addEntry: WidgetAction;
  updateEntry: WidgetAction;
}
