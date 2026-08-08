import { MAX_SOURCE_SLOTS } from "./settings";
import type { RssSettings } from "./types";

const INPUT_CLASS =
  "w-full rounded-[4px] border border-[var(--color-divider)] bg-transparent px-2 py-1 text-xs text-[var(--foreground)]";

export function SettingsFormFields({ settings }: { settings: RssSettings }) {
  const slots = Array.from({ length: MAX_SOURCE_SLOTS }, (_, index) => settings.sources[index]);

  return (
    <div className="mb-2 flex flex-col gap-2">
      <p className="text-[10px] leading-tight text-[var(--color-neutral-500)]">
        Up to {MAX_SOURCE_SLOTS} feeds. Lower priority number shows first; leave a
        slot&apos;s name and URL blank to remove it.
      </p>
      {slots.map((source, index) => {
        const slot = index + 1;
        return (
          <div
            key={slot}
            className="flex flex-col gap-1 border-t border-[var(--color-divider)] pt-2 first:border-t-0 first:pt-0"
          >
            <input
              name={`source${slot}Name`}
              defaultValue={source?.name}
              placeholder={`Source ${slot} name`}
              aria-label={`Source ${slot} name`}
              className={INPUT_CLASS}
            />
            <input
              name={`source${slot}Url`}
              defaultValue={source?.url}
              placeholder="Feed URL"
              aria-label={`Source ${slot} feed URL`}
              className={INPUT_CLASS}
            />
            <input
              name={`source${slot}Priority`}
              defaultValue={source?.priority}
              type="number"
              min={1}
              placeholder="Priority (1 = first)"
              aria-label={`Source ${slot} priority`}
              className={INPUT_CLASS}
            />
          </div>
        );
      })}
    </div>
  );
}
