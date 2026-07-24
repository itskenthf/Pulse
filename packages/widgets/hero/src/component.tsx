import { ActionForm } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { SettingsFormFields } from "./settings-form-fields";
import type { HeroData, HeroSettings } from "./types";

const labelClass = "text-xs font-medium uppercase tracking-wide text-sky-700/70 dark:text-sky-300/70";

export function HeroComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<HeroData, HeroSettings>) {
  return (
    <section className="flex flex-col gap-4 px-1 py-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
          {data?.greeting ?? "Hello"}
        </h1>

        {data && (
          <div>
            <p className={labelClass}>Today</p>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              {data.weatherSummary} in {data.weatherLocation}
            </p>
          </div>
        )}

        <p className="text-sm text-zinc-500 dark:text-zinc-500">Continue working on Pulse</p>

        {data && (
          <div>
            <p className={labelClass}>Quote</p>
            <p className="text-base italic text-zinc-700 dark:text-zinc-300">
              &ldquo;{data.quote}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        <ActionForm action={actions.refresh} submitLabel="Refresh" />

        {actions.updateSettings && (
          <details>
            <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-500">
              Settings
            </summary>
            <ActionForm action={actions.updateSettings} submitLabel="Save" className="mt-2">
              <SettingsFormFields settings={settings} />
            </ActionForm>
          </details>
        )}
      </div>
    </section>
  );
}
