import type { SteamSettings } from "./types";

export function SettingsFormFields({ settings }: { settings: SteamSettings }) {
  return (
    <div className="mb-2 flex flex-col gap-1">
      <input
        name="steamId64"
        defaultValue={settings.steamId64}
        placeholder="SteamID64 (17 digits)"
        aria-label="SteamID64"
        className="w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-950 dark:border-zinc-700 dark:text-zinc-50"
      />
      <p className="text-[10px] leading-tight text-zinc-500 dark:text-zinc-500">
        Find yours at steamid.io. Your Steam profile&apos;s &quot;Game details&quot; privacy
        must be set to Public.
      </p>
    </div>
  );
}
