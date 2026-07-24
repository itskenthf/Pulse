import type { ContributionWeek } from "@pulse/adapter-github";

const LEVEL_CLASSES = [
  "bg-zinc-950/5 dark:bg-white/5",
  "bg-sky-300/70 dark:bg-sky-900",
  "bg-sky-400 dark:bg-sky-700",
  "bg-sky-500 dark:bg-sky-500",
  "bg-sky-600 dark:bg-sky-300",
] as const;

export function Heatmap({ weeks }: { weeks: ContributionWeek[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto" aria-label="Contribution heatmap">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1">
          {week.days.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
              className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
