import type { ContributionWeek } from "@pulse/adapter-github";

const LEVEL_CLASSES = [
  "bg-zinc-200 dark:bg-zinc-800",
  "bg-sky-200 dark:bg-sky-900",
  "bg-sky-400 dark:bg-sky-700",
  "bg-sky-500 dark:bg-sky-500",
  "bg-sky-700 dark:bg-sky-300",
] as const;

export function Heatmap({ weeks }: { weeks: ContributionWeek[] }) {
  return (
    <div className="flex gap-0.5 overflow-hidden" aria-label="Contribution heatmap">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-0.5">
          {week.days.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
              className={`h-2 w-2 rounded-[2px] ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
