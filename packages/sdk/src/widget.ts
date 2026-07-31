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
  /** Hero-only: the new quote text after a `cycleQuote` action, returned
   *  directly instead of via a page-wide `revalidatePath` so the click
   *  updates instantly without forcing every other widget to re-read its
   *  cache too. */
  quote?: string;
  /** Notebook-only: the created entry's id, returned so the client can
   *  upsert into it on subsequent autosaves (while the box stays open)
   *  without a full widget refresh round-trip. */
  entryId?: string;
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

export interface WidgetRenderProps<TData, TSettings, TActions extends WidgetActions = WidgetActions> {
  data: TData | null;
  settings: TSettings;
  actions: TActions;
}

/**
 * A memory-worthy change a widget's `deriveMemories` detected — the raw
 * material for the Timeline page (docs/MEMORY_ROADMAP.md). `source`/
 * `userId`/`id`/`createdAt` are filled in by the DB layer, not the
 * widget — a widget only describes *what* happened.
 */
export interface MemoryEvent {
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Contract every widget implements. The dashboard shell only ever depends
 * on this interface — never on a specific widget's internals.
 *
 * fetchData is called by the scheduler (cron), not by the client — widgets
 * never fetch their own data at render time. render() only ever receives
 * data already read from the widget_cache table.
 */
export interface Widget<
  TData = unknown,
  TSettings = Record<string, unknown>,
  TActions extends WidgetActions = WidgetActions,
> {
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
  render(props: WidgetRenderProps<TData, TSettings, TActions>): ReactNode;
  settings?(): TSettings;
  /** Parses a settings `<form>` submission. Throw to reject invalid input. */
  parseSettingsForm?(formData: FormData): TSettings;
  /** OAuth scopes or other permissions this widget requires. */
  permissions?(): string[];
  /**
   * Pure diff: given the previous cached data (null on first fetch) and
   * the newly fetched data, return any memory-worthy events. No API
   * calls, no side effects — same "pure function per widget package"
   * pattern as pick-quote.ts/streaks.ts. Optional; widgets with nothing
   * memory-worthy (e.g. Hero) simply don't implement it. Called by
   * `refreshWidget` (apps/web/src/lib/refresh-widget.ts) on every
   * refresh — diffing against the previous snapshot, rather than
   * unconditionally logging on every fetch, is what keeps this from
   * flooding the memories table with near-duplicate rows on every cron
   * tick, and makes it naturally idempotent (a change already reflected
   * in the cache won't re-fire next cycle).
   */
  deriveMemories?(previous: TData | null, next: TData): MemoryEvent[];
}
