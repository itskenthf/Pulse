export const WIDGET_ID = "github";
export const WIDGET_NAME = "GitHub";
export const WIDGET_DESCRIPTION = "Contribution activity at a glance";

/** Card renders only the most recent N weeks of the fetched full year —
 *  a full Jan–Dec grid read as mostly-empty grey squares in a narrow
 *  dashboard card, with real activity squeezed into a tiny sliver. The
 *  adapter still fetches the whole year in one request (unchanged); this
 *  only trims what the widget renders. See docs/DECISIONS.md. */
export const RECENT_WEEKS_COUNT = 12;
