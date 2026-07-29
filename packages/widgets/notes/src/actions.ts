import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Notes-only actions — same per-widget extension pattern as Tasks'
 *  `TaskWidgetActions` and Hero's `cycleQuote` (see
 *  `packages/sdk/src/widget.ts`'s `Widget`/`WidgetRenderProps` `TActions`
 *  generic). */
export interface NoteWidgetActions extends WidgetActions {
  addNote: WidgetAction;
  updateNote: WidgetAction;
  deleteNote: WidgetAction;
}
