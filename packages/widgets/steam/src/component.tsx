import { WidgetCard, WidgetMenu } from "@pulse/ui";
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
      action={
        <WidgetMenu
          id="steam"
          actions={actions}
          settingsFields={<SettingsFormFields settings={settings} />}
        />
      }
      accent="indigo"
    >
      {data ? (
        data.games.length > 0 ? (
          <ul className="flex flex-col gap-4">
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
    </WidgetCard>
  );
}
