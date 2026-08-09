import { describe, expect, it } from "vitest";
import { isGoalMet } from "./goal-evaluation";

describe("isGoalMet", () => {
  it("at_least is met when current meets or exceeds target", () => {
    expect(isGoalMet(500, 500, "at_least")).toBe(true);
    expect(isGoalMet(600, 500, "at_least")).toBe(true);
    expect(isGoalMet(400, 500, "at_least")).toBe(false);
  });

  it("at_most is met when current is at or below target", () => {
    expect(isGoalMet(45, 45, "at_most")).toBe(true);
    expect(isGoalMet(44, 45, "at_most")).toBe(true);
    expect(isGoalMet(46, 45, "at_most")).toBe(false);
  });

  it("exactly is met only on an exact match", () => {
    expect(isGoalMet(3, 3, "exactly")).toBe(true);
    expect(isGoalMet(2, 3, "exactly")).toBe(false);
  });
});
