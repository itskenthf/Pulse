import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Tasks-only actions, following the same per-widget extension pattern
 *  Hero's `cycleQuote` introduced — see `packages/sdk/src/widget.ts`'s
 *  `Widget`/`WidgetRenderProps` `TActions` generic. Unlike `cycleQuote`,
 *  these three are essential (not optional) since the widget has nothing
 *  useful to render without them. */
export interface TaskWidgetActions extends WidgetActions {
  addTask: WidgetAction;
  toggleTask: WidgetAction;
  deleteTask: WidgetAction;
}
