import type { ContributionWeek } from "@pulse/adapter-github";

const LEVEL_CLASSES = [
  "bg-[var(--color-neutral-200)]",
  "bg-[var(--color-accent-200)]",
  "bg-[var(--color-accent-400)]",
  "bg-[var(--color-accent-600)]",
  "bg-[var(--color-accent-800)]",
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
              className={`h-3 w-3 rounded-[2px] ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
