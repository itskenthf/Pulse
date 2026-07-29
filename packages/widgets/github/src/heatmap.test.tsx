import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ContributionWeek } from "@pulse/adapter-github";
import { Heatmap } from "./heatmap";

function buildWeeks(startDate: string, totalDays: number): ContributionWeek[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    const dateStr = date.toISOString().slice(0, 10);
    const count = dateStr === "2026-07-26" ? 5 : 0;
    return { date: dateStr, count, level: count > 0 ? 3 : 0 };
  });

  const weeks: ContributionWeek[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push({ days: days.slice(i, i + 7) });
  return weeks;
}

describe("Heatmap", () => {
  const weeks = buildWeeks("2026-01-01", 210);

  it("renders the yearly total, the Less/More legend, and month labels", () => {
    render(<Heatmap weeks={weeks} totalThisYear={162} year={2026} />);

    expect(screen.getByText("162 contributions in 2026")).toBeInTheDocument();
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
    expect(screen.getByText("Jan")).toBeInTheDocument();
  });

  it("shows a count+date popover on hover and hides it on mouse leave", () => {
    render(<Heatmap weeks={weeks} totalThisYear={162} year={2026} />);

    const cell = screen.getByTitle("2026-07-26: 5 contributions");
    fireEvent.mouseEnter(cell);
    expect(screen.getByRole("tooltip")).toHaveTextContent("5 contributions on July 26");

    fireEvent.mouseLeave(cell);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("pins the popover open on tap/click, independent of hover", () => {
    render(<Heatmap weeks={weeks} totalThisYear={162} year={2026} />);

    const cell = screen.getByTitle("2026-07-26: 5 contributions");
    fireEvent.click(cell);

    expect(screen.getByRole("tooltip")).toHaveTextContent("5 contributions on July 26");
  });

  it("uses singular 'contribution' for a count of exactly 1", () => {
    const singleDayWeeks = buildWeeks("2026-01-01", 7).map((week) => ({
      days: week.days.map((day, i) => (i === 0 ? { ...day, count: 1, level: 1 } : day)),
    }));

    render(<Heatmap weeks={singleDayWeeks} totalThisYear={1} year={2026} />);

    expect(screen.getByText("1 contribution in 2026")).toBeInTheDocument();
  });
});
