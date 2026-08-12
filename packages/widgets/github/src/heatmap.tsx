"use client";

import { useMemo } from "react";
import type { ContributionWeek } from "@pulse/adapter-github";
import { glassClass } from "@pulse/ui";
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

const GAP_PX = 2;
const MONTH_ROW_HEIGHT_PX = 14;
const WEEKDAY_LABEL_WIDTH_PX = 24;
const LABEL_TO_GRID_GAP_PX = 8;
/** GitHub's own contribution graph uses a fixed, small cell size (not
 *  stretched to fill whatever container it's in) — this caps how big a
 *  cell can grow. Without a cap, the fill-to-container-width formula
 *  below produces huge cells once the column count is small (e.g. the
 *  12-week recent strip), since the same width is now divided among far
 *  fewer columns than the old full-year (~53 column) grid it was
 *  originally tuned for. */
const MAX_CELL_PX = 11;

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
  const { openDate, toggle, popoverRef } = useDayPopover();
  // Popover toggles re-render this component on every tap — recomputing
  // month labels from scratch each time was pure re-work (see
  // docs/DECISIONS.md's 2026-08-12 entry).
  const monthLabels = useMemo(() => computeMonthLabels(weeks, year), [weeks, year]);
  const columnCount = weeks.length;
  // One cell's edge length, expressed as a CSS calc() using container
  // query width units (cqw). `cqw` resolves against the nearest ancestor
  // that declares `container-type` — that has to be the OUTER row below
  // (which wraps both the weekday-label column and the day grid), not
  // just the day grid's own wrapper, or the label column (a sibling, not
  // a descendant, of a container-type on the grid alone) resolves `cqw`
  // against the wrong ancestor entirely. Since 100cqw here is the outer
  // row's full width, the label column's own width + the gap to the grid
  // must be subtracted from the formula so `cellSize` reflects only the
  // day grid's actual available share — this is what makes both the
  // label row heights and the grid's own cell size agree exactly, so
  // Mon/Wed/Fri always line up with their real rows regardless of card
  // width. Wrapped in `min(..., MAX_CELL_PX)` so cells never grow past a
  // normal, GitHub-like size on wide cards — a full year (~53 columns)
  // or the current recent-weeks strip both still shrink further on
  // narrow widths with no scrolling either way — see docs/DECISIONS.md
  // for why an earlier horizontal-scroll version was wrong.
  const availableForGrid = `(100cqw - ${WEEKDAY_LABEL_WIDTH_PX + LABEL_TO_GRID_GAP_PX}px)`;
  const fillCellSize = `((${availableForGrid} - ${GAP_PX * (columnCount - 1)}px) / ${columnCount})`;
  const cellSize = `min(${fillCellSize}, ${MAX_CELL_PX}px)`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-[var(--color-neutral-600)]">
        {totalThisYear} contribution{totalThisYear === 1 ? "" : "s"} in {year}
      </p>

      <div className="flex [container-type:inline-size]" style={{ gap: LABEL_TO_GRID_GAP_PX }}>
        <div className="flex flex-col text-[10px] text-[var(--color-neutral-400)]" aria-hidden="true">
          <span style={{ height: MONTH_ROW_HEIGHT_PX, marginBottom: GAP_PX }} />
          <div className="flex flex-col" style={{ gap: GAP_PX }}>
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} style={{ width: WEEKDAY_LABEL_WIDTH_PX, height: cellSize }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: MONTH_ROW_HEIGHT_PX, marginBottom: GAP_PX }} aria-hidden="true">
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={label}
                className="absolute top-0 text-[10px] whitespace-nowrap text-[var(--color-neutral-400)]"
                style={{ left: `calc(${weekIndex} * (${cellSize} + ${GAP_PX}px))` }}
              >
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid"
            style={{
              gap: GAP_PX,
              gridTemplateColumns: `repeat(${columnCount}, ${cellSize})`,
              gridTemplateRows: `repeat(7, ${cellSize})`,
              gridAutoFlow: "column",
            }}
            aria-label={`Contribution heatmap, ${year}`}
          >
            {weeks.flatMap((week) =>
              week.days.map((day) => {
                const label = `${formatMonthDay(day.date)}: ${day.count} contribution${day.count === 1 ? "" : "s"}`;
                const popoverId = `heatmap-popover-${day.date}`;
                return (
                  <div key={day.date} className="relative">
                    <button
                      type="button"
                      onClick={() => toggle(day.date)}
                      title={`${day.date}: ${day.count} contribution${day.count === 1 ? "" : "s"}`}
                      aria-label={label}
                      aria-expanded={openDate === day.date}
                      aria-describedby={openDate === day.date ? popoverId : undefined}
                      className={`block h-full w-full rounded-[2px] ${LEVEL_CLASSES[day.level] ?? LEVEL_CLASSES[0]}`}
                    />
                    {openDate === day.date && (
                      <div
                        ref={popoverRef}
                        id={popoverId}
                        role="tooltip"
                        className={`absolute top-full left-1/2 z-10 mt-1 -translate-x-1/2 rounded-[4px] px-2 py-1 text-xs whitespace-nowrap text-[var(--foreground)] ${glassClass("light")}`}
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
