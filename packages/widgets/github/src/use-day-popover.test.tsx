import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDayPopover } from "./use-day-popover";

/** Mirrors the real Heatmap: one button per day, and — only for whichever
 *  date is currently open — a popover element wired to popoverRef. */
function TestGrid() {
  const { openDate, toggle, popoverRef } = useDayPopover();

  return (
    <div>
      <button onClick={() => toggle("2026-07-26")}>day-26</button>
      <button onClick={() => toggle("2026-07-27")}>day-27</button>
      <button>outside</button>
      {openDate && (
        <div ref={popoverRef} role="tooltip">
          {openDate}
        </div>
      )}
    </div>
  );
}

describe("useDayPopover", () => {
  it("opens a day's popover on tap/click", () => {
    render(<TestGrid />);

    fireEvent.click(screen.getByText("day-26"));

    expect(screen.getByRole("tooltip")).toHaveTextContent("2026-07-26");
  });

  it("clicking the same day again closes it (toggle)", () => {
    render(<TestGrid />);

    fireEvent.click(screen.getByText("day-26"));
    fireEvent.click(screen.getByText("day-26"));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opening a second day closes the first and opens the new one", () => {
    render(<TestGrid />);

    fireEvent.click(screen.getByText("day-26"));
    fireEvent.click(screen.getByText("day-27"));

    expect(screen.getByRole("tooltip")).toHaveTextContent("2026-07-27");
  });

  it("closes when a pointerdown happens outside the open popover", () => {
    render(<TestGrid />);
    fireEvent.click(screen.getByText("day-26"));

    fireEvent.pointerDown(screen.getByText("outside"));

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("does not close on a pointerdown inside the popover itself", () => {
    render(<TestGrid />);
    fireEvent.click(screen.getByText("day-26"));

    fireEvent.pointerDown(screen.getByRole("tooltip"));

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("closes on Escape", () => {
    render(<TestGrid />);
    fireEvent.click(screen.getByText("day-26"));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
