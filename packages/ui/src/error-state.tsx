import { AlertTriangle } from "lucide-react";
import { glassClass } from "./glass";
import { RADIUS } from "./tokens";

export interface ErrorStateProps {
  title?: string;
  message?: string;
}

/**
 * Rendered in place of a single widget that failed to load — each widget
 * is wrapped in its own WidgetErrorBoundary (see apps/web's WidgetGrid),
 * so one widget throwing shows this instead of taking down the rest of
 * the dashboard. No retry button: a widget that failed before rendering
 * has no WidgetMenu to offer one from — reloading the page is the
 * recovery path, same as any other widget's built-in refresh already
 * provides once it's rendering successfully.
 */
export function ErrorState({ title = "Something went wrong", message }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex h-full min-h-32 flex-col items-center justify-center gap-2 ${RADIUS.card} p-6 text-center ${glassClass("light")}`}
    >
      <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {message && <p className="text-xs text-zinc-500 dark:text-zinc-500">{message}</p>}
    </div>
  );
}
