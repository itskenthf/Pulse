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
    <div className="flex w-full gap-0.5 sm:w-auto sm:gap-1" aria-label="Contribution heatmap">
      {weeks.map((week, weekIndex) => (
        <div
          key={weekIndex}
          className="flex min-w-0 flex-1 basis-0 flex-col gap-0.5 sm:flex-none sm:basis-auto sm:gap-1"
        >
          {week.days.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
              className={`aspect-square w-full max-w-3 rounded-[2px] sm:h-3 sm:w-3 sm:max-w-none ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
