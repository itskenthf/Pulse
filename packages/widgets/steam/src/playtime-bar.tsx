import { Trophy } from "lucide-react";
import { formatHours, formatRelativeDay } from "./format";
import type { SteamGame } from "./types";

/**
 * One game's full detail: cover art, total/recent playtime as a glass
 * progress bar, last-played (real, from GetOwnedGames), and achievement
 * completion when the game supports/exposes it. Only 2 games are shown
 * now (see constants.ts), so each gets room to carry this much detail.
 */
export function PlaytimeBar({ game, maxMinutes }: { game: SteamGame; maxMinutes: number }) {
  const pct =
    maxMinutes > 0 ? Math.max(4, Math.round((game.playtimeForeverMinutes / maxMinutes) * 100)) : 0;
  const achievementPct = game.achievements
    ? Math.round((game.achievements.unlocked / Math.max(1, game.achievements.total)) * 100)
    : null;

  return (
    <div className="flex items-start gap-3">
      {game.iconUrl ? (
        // Plain <img>: external Steam CDN icons, tiny fixed size — not
        // worth routing through next/image's optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={game.iconUrl}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm"
        />
      ) : (
        <span className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-sky-200 to-indigo-200 dark:from-sky-500/20 dark:to-indigo-500/20" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {game.name}
          </span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
            {formatHours(game.playtimeForeverMinutes)} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-white/50 dark:bg-white/5 dark:ring-white/10">
            <div
              className="pulse-bar-fill h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_10px_-1px_rgba(56,189,248,0.7)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-500">
          <span>{formatHours(game.playtime2WeeksMinutes)} recent</span>
          {game.lastPlayedAt !== undefined && (
            <span>Last played {formatRelativeDay(game.lastPlayedAt)}</span>
          )}
          {game.achievements && (
            <span className="flex items-center gap-1">
              <Trophy className="h-3 w-3" aria-hidden="true" />
              {game.achievements.unlocked}/{game.achievements.total} ({achievementPct}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
