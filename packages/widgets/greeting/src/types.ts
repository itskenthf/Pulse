export type GreetingPeriod = "morning" | "afternoon" | "evening" | "night";

export interface GreetingSettings {
  name: string;
  /** IANA time zone (e.g. "Asia/Manila") — the server runs in UTC, so
   *  without this the greeting's time-of-day would be wrong for the user. */
  timeZone: string;
}

export interface GreetingData {
  message: string;
  period: GreetingPeriod;
  generatedAt: string;
}
