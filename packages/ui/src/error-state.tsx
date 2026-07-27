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
 * the dashboard. No retry button here: a widget that failed before
 * rendering has no WidgetMenu to offer one from. WidgetErrorBoundary
 * itself resets on the next server-driven re-render though (e.g. the
 * global "Pulse" refresh, or any other widget's refresh, since all of
 * them revalidate the whole page) — so this state clears on its own once
 * fresh data renders successfully, not only on a full page reload.
 */
export function ErrorState({ title = "Something went wrong", message }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex h-full min-h-32 flex-col items-center justify-center gap-2 ${RADIUS.card} p-6 text-center ${glassClass("light")}`}
    >
      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
      <p className="font-heading text-sm font-medium text-[var(--foreground)]">{title}</p>
      {message && <p className="text-xs text-[var(--color-neutral-500)]">{message}</p>}
    </div>
  );
}
