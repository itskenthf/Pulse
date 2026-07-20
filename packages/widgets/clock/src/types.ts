export interface ClockSettings {
  /** IANA time zone (e.g. "Asia/Kuching"). */
  timeZone: string;
  hour12: boolean;
}

/**
 * The clock ticks entirely client-side (see clock-display.tsx) — there's
 * no real external data to fetch. fetchData() still exists to satisfy the
 * Widget contract; this just records that it ran.
 */
export interface ClockData {
  registeredAt: string;
}
