import type { WeatherSettings } from "./types";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-950 dark:border-zinc-700 dark:text-zinc-50";

export function SettingsFormFields({ settings }: { settings: WeatherSettings }) {
  return (
    <div className="mb-2 grid grid-cols-3 gap-2">
      <input
        name="label"
        defaultValue={settings.label}
        placeholder="Location"
        aria-label="Location label"
        className={inputClass}
      />
      <input
        name="latitude"
        type="number"
        step="any"
        defaultValue={settings.latitude}
        placeholder="Latitude"
        aria-label="Latitude"
        className={inputClass}
      />
      <input
        name="longitude"
        type="number"
        step="any"
        defaultValue={settings.longitude}
        placeholder="Longitude"
        aria-label="Longitude"
        className={inputClass}
      />
    </div>
  );
}
