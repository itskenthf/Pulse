export interface CalendarDateSettings {
  /** IANA time zone — the server runs in UTC, so "today" needs this to be correct. */
  timeZone: string;
}

export interface CalendarDateData {
  formatted: string;
}
