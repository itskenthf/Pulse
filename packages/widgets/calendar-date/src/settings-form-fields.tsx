import type { CalendarDateSettings } from "./types";

export function SettingsFormFields({ settings }: { settings: CalendarDateSettings }) {
  return (
    <div className="mb-2">
      <input
        name="timeZone"
        defaultValue={settings.timeZone}
        placeholder="IANA time zone"
        aria-label="Time zone"
        className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
      />
    </div>
  );
}
