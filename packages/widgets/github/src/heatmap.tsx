"use client";

import { useState } from "react";
import type { ContributionWeek } from "@pulse/adapter-github";
import { GLASS_CHIP } from "@pulse/ui";
import { formatMonthDay } from "./format";
import { computeMonthLabels } from "./heatmap-layout";
import { useDayPopover } from "./use-day-popover";

const LEVEL_CLASSES = [
  "bg-[var(--color-neutral-200)]",
  "bg-[var(--color-accent-200)]",
  "bg-[var(--color-accent-400)]",
  "bg-[var(--color-accent-600)]",
  "bg-[var(--color-accent-800)]",
] as const;

/** Fixed cell/gap size at every breakpoint — a full year (~53 columns) is
 *  wider than a card can guarantee at every width, so this scrolls
 *  horizontally instead of shrinking cells to illegibility (see
 *  docs/DECISIONS.md). Kept as plain numbers (not Tailwind classes) since
 *  the month-label row's absolute positioning needs the exact same
 *  values in JS to line labels up with their columns. */
const CELL_PX = 10;
const GAP_PX = 3;
const STEP_PX = CELL_PX + GAP_PX;

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""] as const;

export function Heatmap({
  weeks,
  totalThisYear,
  year,
}: {
  weeks: ContributionWeek[];
  totalThisYear: number;
  year: number;
}) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const { openDate, toggle, popoverRef } = useDayPopover();
  const monthLabels = computeMonthLabels(weeks, year);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--color-neutral-600)]">
        {totalThisYear} contribution{totalThisYear === 1 ? "" : "s"} in {year}
      </p>

      <div className="flex gap-2">
        <div
          className="flex flex-col gap-[3px] text-[10px] text-[var(--color-neutral-400)]"
          style={{ paddingTop: STEP_PX + 4 }}
          aria-hidden="true"
        >
          {WEEKDAY_LABELS.map((label, i) => (
            <span key={i} style={{ height: CELL_PX, lineHeight: `${CELL_PX}px` }}>
              {label}
            </span>
          ))}
        </div>

        <div className="min-w-0 overflow-x-auto">
          <div
            className="relative"
            style={{ width: weeks.length * STEP_PX, height: STEP_PX + 4 }}
            aria-hidden="true"
          >
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={label}
                className="absolute top-0 text-[10px] whitespace-nowrap text-[var(--color-neutral-400)]"
                style={{ left: weekIndex * STEP_PX }}
              >
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid gap-[3px]"
            style={{
              gridTemplateRows: `repeat(7, ${CELL_PX}px)`,
              gridAutoFlow: "column",
              gridAutoColumns: `${CELL_PX}px`,
            }}
            aria-label={`Contribution heatmap, ${year}`}
          >
            {weeks.flatMap((week) =>
              week.days.map((day) => {
                const isOpen = openDate === day.date || hoveredDate === day.date;
                return (
                  <div key={day.date} className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredDate(day.date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      onClick={() => toggle(day.date)}
                      title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
                      className={`block h-full w-full rounded-[2px] ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
                    />
                    {isOpen && (
                      <div
                        ref={openDate === day.date ? popoverRef : undefined}
                        role="tooltip"
                        className={`absolute top-full left-1/2 z-10 mt-1 -translate-x-1/2 rounded-[4px] px-2 py-1 text-xs whitespace-nowrap text-[var(--foreground)] ${GLASS_CHIP} bg-[var(--background)]`}
                      >
                        {day.count} contribution{day.count === 1 ? "" : "s"} on{" "}
                        {formatMonthDay(day.date)}
                      </div>
                    )}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-[var(--color-neutral-500)]">
        <span>Less</span>
        {LEVEL_CLASSES.map((className, level) => (
          <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
