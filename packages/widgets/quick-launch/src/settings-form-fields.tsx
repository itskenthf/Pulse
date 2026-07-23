import { MAX_LINKS } from "./constants";
import type { QuickLaunchSettings } from "./types";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-xs text-zinc-950 dark:border-zinc-700 dark:text-zinc-50";

export function SettingsFormFields({ settings }: { settings: QuickLaunchSettings }) {
  return (
    <div className="mb-2 flex flex-col gap-1">
      {Array.from({ length: MAX_LINKS }, (_, i) => {
        const link = settings.links[i];
        return (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input
              name={`label${i}`}
              defaultValue={link?.label ?? ""}
              placeholder="Label"
              aria-label={`Link ${i + 1} label`}
              className={inputClass}
            />
            <input
              name={`url${i}`}
              defaultValue={link?.url ?? ""}
              placeholder="URL"
              aria-label={`Link ${i + 1} URL`}
              className={inputClass}
            />
          </div>
        );
      })}
    </div>
  );
}
