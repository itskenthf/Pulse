import type { WidgetAction, WidgetActions } from "@pulse/sdk";

/** Reading-only actions, following the same per-widget extension pattern
 *  Tasks' addTask/toggleTask/deleteTask established. `addBook` is the rare
 *  one; `updateProgress`/`markFinished`/`deleteBook` all operate on a
 *  specific book (bookId in the form), since multiple books can be
 *  "reading" at once. */
export interface ReadingWidgetActions extends WidgetActions {
  addBook: WidgetAction;
  updateProgress: WidgetAction;
  markFinished: WidgetAction;
  deleteBook: WidgetAction;
}
