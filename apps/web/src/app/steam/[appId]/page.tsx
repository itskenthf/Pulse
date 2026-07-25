import { ArrowLeft, Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readWidgetCache } from "@pulse/database";
import { glassClass } from "@pulse/ui";
import {
  CoverArt,
  formatHours,
  formatRelativeDay,
  WIDGET_ID,
  type SteamData,
} from "@pulse/widget-steam";
import { auth } from "@/auth";

export default async function SteamGamePage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const cached = await readWidgetCache<SteamData>(session.user.id, WIDGET_ID);
  const game = cached?.data.games.find((g) => String(g.appId) === appId);
  if (!game) {
    notFound();
  }

  const achievementPct = game.achievements
    ? Math.round((game.achievements.unlocked / Math.max(1, game.achievements.total)) * 100)
    : null;

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-sky-200 via-cyan-100 to-violet-200 dark:from-slate-950 dark:via-blue-950 dark:to-violet-950">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <div className={`flex flex-col gap-6 rounded-3xl p-6 sm:flex-row ${glassClass("light")}`}>
          <div className="w-full max-w-56 sm:shrink-0">
            <CoverArt appId={game.appId} name={game.name} />
          </div>

          <div className="flex flex-1 flex-col gap-5">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {game.name}
            </h1>

            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <Stat label="Total playtime" value={formatHours(game.playtimeForeverMinutes)} />
              <Stat label="Last 2 weeks" value={formatHours(game.playtime2WeeksMinutes)} />
              {game.lastPlayedAt !== undefined && (
                <Stat label="Last played" value={formatRelativeDay(game.lastPlayedAt)} />
              )}
            </div>

            {game.achievements && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  Achievements — {game.achievements.unlocked}/{game.achievements.total} (
                  {achievementPct}%)
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/40 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-inset ring-white/50 dark:bg-white/5 dark:ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 shadow-[0_0_10px_-1px_rgba(56,189,248,0.7)]"
                    style={{ width: `${achievementPct}%` }}
                  />
                </div>
              </div>
            )}

            {!game.achievements && (
              <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-500">
                <Clock className="h-4 w-4" aria-hidden="true" />
                No achievement data available for this game.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-500">{label}</span>
    </div>
  );
}
