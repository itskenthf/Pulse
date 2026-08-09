import { describe, expect, it } from "vitest";
import { progressPercent } from "./progress";

describe("progressPercent", () => {
  it("at_least is a simple ratio, clamped at 100", () => {
    expect(progressPercent(250, 500, "at_least")).toBe(50);
    expect(progressPercent(600, 500, "at_least")).toBe(100);
    expect(progressPercent(0, 500, "at_least")).toBe(0);
  });

  it("at_most without a start measures the raw ratio", () => {
    expect(progressPercent(3, 3, "at_most")).toBe(100);
  });

  it("at_most with a start measures ground covered toward a decreasing target", () => {
    // start 50kg, target 45kg, current 47.5kg — halfway there
    expect(progressPercent(47.5, 45, "at_most", 50)).toBe(50);
    expect(progressPercent(50, 45, "at_most", 50)).toBe(0);
    expect(progressPercent(45, 45, "at_most", 50)).toBe(100);
    // overshooting the target still clamps at 100, not beyond
    expect(progressPercent(43, 45, "at_most", 50)).toBe(100);
  });

  it("handles a zero target for at_least without dividing by zero", () => {
    expect(progressPercent(0, 0, "at_least")).toBe(100);
  });
});
