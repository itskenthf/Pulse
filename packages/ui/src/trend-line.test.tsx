import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendLine } from "./trend-line";

describe("TrendLine", () => {
  it("renders a polyline with one coordinate per point", () => {
    const { container } = render(<TrendLine points={[10, 20, 15, 30]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    expect(polyline!.getAttribute("points")!.trim().split(" ")).toHaveLength(4);
  });

  it("has no fill on the line, matching the no-fills design constraint", () => {
    const { container } = render(<TrendLine points={[10, 20, 15]} />);
    expect(container.querySelector("polyline")).toHaveAttribute("fill", "none");
  });

  it("renders a dashed goal reference line only when goalValue is given", () => {
    const withGoal = render(<TrendLine points={[10, 20]} goalValue={15} />);
    expect(withGoal.container.querySelector("line")).not.toBeNull();

    const withoutGoal = render(<TrendLine points={[10, 20]} />);
    expect(withoutGoal.container.querySelector("line")).toBeNull();
  });

  it("renders an empty svg without throwing when given no points", () => {
    const { container } = render(<TrendLine points={[]} />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("polyline")).toBeNull();
  });

  it("renders a single point without dividing by zero", () => {
    const { container } = render(<TrendLine points={[42]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline!.getAttribute("points")).toBeTruthy();
  });
});
