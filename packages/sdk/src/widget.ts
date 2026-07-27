import type { ReactNode } from "react";
import type { ZodType } from "zod";

/**
 * "hero" widgets render full-width above the card grid, chromeless (no
 * WidgetCard) — used for a single banner-style widget, not a general
 * layout escape hatch. Every other size renders inside the responsive grid.
 */
export type WidgetSize = "sm" | "md" | "lg" | "hero";

export interface WidgetFetchContext {
  userId: string;
  /**
   * Aborts once the scheduler's per-widget timeout elapses (see
   * `refreshWidget` in apps/web/src/lib/refresh-widget.ts). Adapters should
   * pass this to every `fetch()` call so one hung upstream API can't stall
   * an entire cron batch — a widget whose fetchData ignores it just won't
   * time out, it isn't a contract violation.
   */
  signal?: AbortSignal;
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
  /** Hero-only: swaps just the quote, without a full refresh. Optional
   *  since every other widget's render() ignores it. */
  cycleQuote?: WidgetAction;
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
  /**
   * Optional runtime shape check for rows read back out of `widget_cache`.
   * Without this, a cache row written under an older TData shape (e.g.
   * after this widget's data contract changes across a deploy) gets
   * returned typed as the *current* shape with nothing checking that at
   * runtime — every widget today happens to guard defensively enough that
   * nothing has broken, but nothing enforces that going forward. When
   * provided, `readWidgetCache` parses the row through it before handing
   * data to render() and throws on a mismatch (surfacing through the
   * widget's normal ErrorState) rather than silently trusting a stale shape.
   */
  dataSchema?: ZodType<TData>;
  render(props: WidgetRenderProps<TData, TSettings>): ReactNode;
  settings?(): TSettings;
  /** Parses a settings `<form>` submission. Throw to reject invalid input. */
  parseSettingsForm?(formData: FormData): TSettings;
  /** OAuth scopes or other permissions this widget requires. */
  permissions?(): string[];
}
