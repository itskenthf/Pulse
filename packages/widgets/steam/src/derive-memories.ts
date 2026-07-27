import type { MemoryEvent } from "@pulse/sdk";
import type { SteamData } from "./types";

/** Ignore playtime upticks smaller than this — a cron tick landing
 *  mid-session shouldn't log a memory for a few minutes of drift. */
const MIN_PLAYTIME_DELTA_MINUTES = 15;

/**
 * Diffs `next.games` against the previous snapshot by `appId` — a new
 * appId is a newly-started game, an existing one with meaningfully more
 * playtime is a play session. See the doc comment on
 * `Widget.deriveMemories` in @pulse/sdk for why this diffs rather than
 * logging every fetch.
 */
export function deriveSteamMemories(previous: SteamData | null, next: SteamData): MemoryEvent[] {
  const previousGames = new Map((previous?.games ?? []).map((game) => [game.appId, game]));
  const events: MemoryEvent[] = [];

  for (const game of next.games) {
    const previousGame = previousGames.get(game.appId);

    if (!previousGame) {
      events.push({ title: `Started playing ${game.name}` });
      continue;
    }

    const deltaMinutes = game.playtimeForeverMinutes - previousGame.playtimeForeverMinutes;
    if (deltaMinutes >= MIN_PLAYTIME_DELTA_MINUTES) {
      const description =
        deltaMinutes < 60
          ? `${Math.round(deltaMinutes)}m this session`
          : `${(deltaMinutes / 60).toFixed(1)}h this session`;
      events.push({ title: `Played ${game.name}`, description });
    }
  }

  return events;
}
