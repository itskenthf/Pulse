import type { ReactNode } from "react";

export type WidgetSize = "sm" | "md" | "lg";

export interface WidgetFetchContext {
  userId: string;
}

export interface WidgetRenderProps<TData, TSettings> {
  data: TData | null;
  settings: TSettings;
}

/**
 * Contract every widget implements. The dashboard shell only ever depends
 * on this interface — never on a specific widget's internals.
 *
 * fetchData is called by the scheduler (cron), not by the client — widgets
 * never fetch their own data at render time. render() only ever receives
 * data already read from the widget_cache table.
 */
export interface Widget<TData = unknown, TSettings = Record<string, never>> {
  id: string;
  name: string;
  size: WidgetSize;
  /** Suggested refresh interval, in seconds. */
  refreshInterval: number;
  fetchData(context: WidgetFetchContext): Promise<TData>;
  render(props: WidgetRenderProps<TData, TSettings>): ReactNode;
  settings?(): TSettings;
  /** OAuth scopes or other permissions this widget requires. */
  permissions?(): string[];
}
