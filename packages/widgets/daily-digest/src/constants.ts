export const WIDGET_ID = "daily-digest";
export const WIDGET_NAME = "Daily Digest";
export const WIDGET_DESCRIPTION = "Today's activity across every widget, grouped by source";

/** How many event titles to preview per source before collapsing the
 *  rest into "+N more" — a card, not a second Timeline. */
export const MAX_TITLES_PER_SOURCE = 3;

/** How far back to read from the memories table before filtering to
 *  today — generous enough to cover a full day's events even on a
 *  busy day, without scanning the whole table. */
export const MEMORY_LOOKBACK = 200;
