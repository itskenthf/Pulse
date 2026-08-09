import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "./progress-ring";

function circles(container: HTMLElement) {
  return container.querySelectorAll("circle");
}

describe("ProgressRing", () => {
  it("renders a full dashoffset at 0%", () => {
    const { container } = render(<ProgressRing percent={0} size={64} strokeWidth={4} />);
    const [, progress] = circles(container);
    const circumference = 2 * Math.PI * ((64 - 4) / 2);
    expect(progress).toHaveAttribute("stroke-dashoffset", String(circumference));
  });

  it("renders a zero dashoffset at 100%", () => {
    const { container } = render(<ProgressRing percent={100} size={64} strokeWidth={4} />);
    const [, progress] = circles(container);
    expect(progress).toHaveAttribute("stroke-dashoffset", "0");
  });

  it("renders a half dashoffset at 50%", () => {
    const { container } = render(<ProgressRing percent={50} size={64} strokeWidth={4} />);
    const [, progress] = circles(container);
    const circumference = 2 * Math.PI * ((64 - 4) / 2);
    expect(progress).toHaveAttribute("stroke-dashoffset", String(circumference / 2));
  });

  it("clamps a percent over 100 to a zero dashoffset", () => {
    const { container } = render(<ProgressRing percent={140} size={64} strokeWidth={4} />);
    const [, progress] = circles(container);
    expect(progress).toHaveAttribute("stroke-dashoffset", "0");
  });

  it("clamps a negative percent to a full dashoffset", () => {
    const { container } = render(<ProgressRing percent={-20} size={64} strokeWidth={4} />);
    const [, progress] = circles(container);
    const circumference = 2 * Math.PI * ((64 - 4) / 2);
    expect(progress).toHaveAttribute("stroke-dashoffset", String(circumference));
  });

  it("renders both circles with fill none, never a filled donut", () => {
    const { container } = render(<ProgressRing percent={50} />);
    for (const circle of circles(container)) {
      expect(circle).toHaveAttribute("fill", "none");
    }
  });

  it("renders centered label content", () => {
    render(<ProgressRing percent={50}>62%</ProgressRing>);
    expect(screen.getByText("62%")).toBeInTheDocument();
  });
});
