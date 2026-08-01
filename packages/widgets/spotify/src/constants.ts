export const WIDGET_ID = "spotify";
export const WIDGET_NAME = "Spotify";
export const WIDGET_DESCRIPTION = "Your top artist, genre, and tracks";
/** Kept short — this widget is meant for a quick glance, not a full list
 *  (see docs/DECISIONS.md's dashboard-polish entry). */
export const TRACK_LIMIT = 3;
/** Sample size for deriving "top genre" — Spotify has no genre endpoint,
 *  so this needs enough artists for the frequency count to mean anything. */
export const ARTIST_LIMIT = 5;
export const PROVIDER = "spotify";
