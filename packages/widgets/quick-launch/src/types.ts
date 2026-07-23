export interface QuickLaunchLink {
  label: string;
  url: string;
}

export interface QuickLaunchSettings {
  /** Fixed-length (MAX_LINKS) — unused slots are empty strings. */
  links: QuickLaunchLink[];
}

/** Pure config widget — there's no external data, settings are the content. */
export interface QuickLaunchData {
  registeredAt: string;
}
