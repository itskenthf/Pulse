import type { SteamSettings } from "./types";

export function SettingsFormFields({ settings }: { settings: SteamSettings }) {
  return (
    <div className="mb-2 flex flex-col gap-1">
      <input
        name="steamId64"
        defaultValue={settings.steamId64}
        placeholder="SteamID64 (17 digits)"
        aria-label="SteamID64"
        className="w-full rounded-[4px] border border-[var(--color-divider)] bg-transparent px-2 py-1 text-xs text-[var(--foreground)]"
      />
      <p className="text-[10px] leading-tight text-[var(--color-neutral-500)]">
        Find yours at steamid.io. Your Steam profile&apos;s &quot;Game details&quot; privacy
        must be set to Public.
      </p>
    </div>
  );
}
