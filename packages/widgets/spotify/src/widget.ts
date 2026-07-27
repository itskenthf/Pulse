import type { Widget } from "@pulse/sdk";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { SpotifyComponent } from "./component";
import { deriveSpotifyMemories } from "./derive-memories";
import { fetchSpotifyData } from "./fetch";
import { spotifyDataSchema, type SpotifyData } from "./types";

export const spotifyWidget: Widget<SpotifyData> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "md",
  refreshInterval: 10800, // 3h — matches Steam's "entertainment data" cadence
  fetchData: fetchSpotifyData,
  dataSchema: spotifyDataSchema,
  render: SpotifyComponent,
  permissions: () => ["user-top-read"],
  deriveMemories: deriveSpotifyMemories,
};
