import type { ReactNode } from "react";

/**
 * "hero" widgets render full-width above the card grid, chromeless (no
 * WidgetCard) — used for a single banner-style widget, not a general
 * layout escape hatch. Every other size renders inside the responsive grid.
 */
export type WidgetSize = "sm" | "md" | "lg" | "hero";

export interface WidgetFetchContext {
  userId: string;
}

export interface WidgetActionState {
  error?: string;
}

/** A server action bindable to a `<form action>`, used with `useActionState`. */
export type WidgetAction = (
  prevState: WidgetActionState,
  formData: FormData,
) => Promise<WidgetActionState>;

/**
 * Actions the shell wires up (session lookup, cache/settings writes) and
 * hands down to a widget's render(). Widgets consume these without ever
 * importing the app's auth or data layer directly.
 */
export interface WidgetActions {
  refresh: WidgetAction;
  updateSettings?: WidgetAction;
}

export interface WidgetRenderProps<TData, TSettings> {
  data: TData | null;
  settings: TSettings;
  actions: WidgetActions;
}

/**
 * Contract every widget implements. The dashboard shell only ever depends
 * on this interface — never on a specific widget's internals.
 *
 * fetchData is called by the scheduler (cron), not by the client — widgets
 * never fetch their own data at render time. render() only ever receives
 * data already read from the widget_cache table.
 */
export interface Widget<TData = unknown, TSettings = Record<string, unknown>> {
  id: string;
  name: string;
  size: WidgetSize;
  /** Suggested refresh interval, in seconds. */
  refreshInterval: number;
  fetchData(context: WidgetFetchContext): Promise<TData>;
  render(props: WidgetRenderProps<TData, TSettings>): ReactNode;
  settings?(): TSettings;
  /** Parses a settings `<form>` submission. Throw to reject invalid input. */
  parseSettingsForm?(formData: FormData): TSettings;
  /** OAuth scopes or other permissions this widget requires. */
  permissions?(): string[];
}
