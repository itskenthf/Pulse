export const WIDGET_ID = "notebook";
export const WIDGET_NAME = "Notebook";
export const WIDGET_DESCRIPTION = "A freeform stream of thoughts — no titles, no tags, just writing";

/** Entries beyond this are still stored, just not rendered on the card
 *  (spec: "cap how many entries render at once ... rather than an
 *  infinite scroll"). */
export const RENDER_LIMIT = 10;

/** A reasonable abuse ceiling, not a tweet-style limit — this is a
 *  notebook, not a character-constrained form. */
export const MAX_CONTENT_LENGTH = 2000;

/** How long to wait after the last keystroke before autosaving. */
export const AUTOSAVE_DEBOUNCE_MS = 1000;
