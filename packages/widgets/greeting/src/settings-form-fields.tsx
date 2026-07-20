import type { GreetingSettings } from "./types";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-950 dark:border-zinc-700 dark:text-zinc-50";

export function SettingsFormFields({ settings }: { settings: GreetingSettings }) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-2">
      <input
        name="name"
        defaultValue={settings.name}
        placeholder="Your name"
        aria-label="Your name"
        className={inputClass}
      />
      <input
        name="timeZone"
        defaultValue={settings.timeZone}
        placeholder="IANA time zone"
        aria-label="Time zone"
        className={inputClass}
      />
    </div>
  );
}
