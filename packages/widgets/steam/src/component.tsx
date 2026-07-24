import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { SteamIcon } from "./icon";
import { PlaytimeBar } from "./playtime-bar";
import { SettingsFormFields } from "./settings-form-fields";
import type { SteamData, SteamSettings } from "./types";

export function SteamComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<SteamData, SteamSettings>) {
  return (
    <WidgetCard
      title="Steam"
      icon={<SteamIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" variant="icon" />}
    >
      {data ? (
        data.games.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {(() => {
              const maxMinutes = Math.max(...data.games.map((g) => g.playtimeForeverMinutes));
              return data.games.map((game) => (
                <li key={game.appId}>
                  <PlaytimeBar game={game} maxMinutes={maxMinutes} />
                </li>
              ));
            })()}
          </ul>
        ) : (
          <p>
            No games played in the last 2 weeks — or your Steam profile&apos;s
            &quot;Game details&quot; privacy isn&apos;t set to Public.
          </p>
        )
      ) : (
        <p>No data yet — set your SteamID64 in settings, then refresh.</p>
      )}

      {actions.updateSettings && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-500">
            Settings
          </summary>
          <ActionForm action={actions.updateSettings} submitLabel="Save" className="mt-2">
            <SettingsFormFields settings={settings} />
          </ActionForm>
        </details>
      )}
    </WidgetCard>
  );
}
