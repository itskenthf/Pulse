import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./progress-bar";

describe("ProgressBar", () => {
  it("sizes the fill to the given percent", () => {
    const { container } = render(<ProgressBar percent={40} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("40%");
  });

  it("clamps a percent over 100 to 100%", () => {
    const { container } = render(<ProgressBar percent={150} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("clamps a negative percent to 0%", () => {
    const { container } = render(<ProgressBar percent={-20} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("is decorative (no progressbar role) without a label", () => {
    render(<ProgressBar percent={50} />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("exposes an accessible progressbar role and value when labeled", () => {
    render(<ProgressBar percent={50} label="Calories, 1450 of 2800" />);
    const bar = screen.getByRole("progressbar", { name: "Calories, 1450 of 2800" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });
});
