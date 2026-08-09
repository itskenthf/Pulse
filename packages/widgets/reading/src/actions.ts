import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Reading-only actions, following the same per-widget extension pattern
 *  Tasks' addTask/toggleTask/deleteTask established. `startBook` and
 *  `updateProgress` are deliberately separate (not one combined form) —
 *  starting a book is rare, updating the current page is the daily action. */
export interface ReadingWidgetActions extends WidgetActions {
  startBook: WidgetAction;
  updateProgress: WidgetAction;
  clearBook: WidgetAction;
}
