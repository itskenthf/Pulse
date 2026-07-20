import type { ClockSettings } from "./types";

export function SettingsFormFields({ settings }: { settings: ClockSettings }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <input
        name="timeZone"
        defaultValue={settings.timeZone}
        placeholder="IANA time zone"
        aria-label="Time zone"
        className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
      />
      <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <input type="checkbox" name="hour12" defaultChecked={settings.hour12} />
        12h
      </label>
    </div>
  );
}
