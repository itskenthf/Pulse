import { describe, expect, it } from "vitest";
import { weightTrendInsight } from "./weight-trend";

describe("weightTrendInsight", () => {
  it("returns null with fewer than two logs", () => {
    expect(weightTrendInsight([])).toBeNull();
    expect(weightTrendInsight([{ loggedOn: "2026-08-01", weightKg: 60 }])).toBeNull();
  });

  it("reports a loss when weight decreased", () => {
    const result = weightTrendInsight([
      { loggedOn: "2026-08-01", weightKg: 62 },
      { loggedOn: "2026-08-15", weightKg: 61 },
    ]);
    expect(result).toBe("You've lost 1kg this month.");
  });

  it("reports a gain when weight increased", () => {
    const result = weightTrendInsight([
      { loggedOn: "2026-08-01", weightKg: 60 },
      { loggedOn: "2026-08-15", weightKg: 60.6 },
    ]);
    expect(result).toBe("You've gained 0.6kg this month.");
  });

  it("is order-independent — sorts by date before comparing", () => {
    const result = weightTrendInsight([
      { loggedOn: "2026-08-15", weightKg: 61 },
      { loggedOn: "2026-08-01", weightKg: 62 },
    ]);
    expect(result).toBe("You've lost 1kg this month.");
  });

  it("reports steady weight for a negligible change", () => {
    const result = weightTrendInsight([
      { loggedOn: "2026-08-01", weightKg: 60 },
      { loggedOn: "2026-08-15", weightKg: 60.04 },
    ]);
    expect(result).toBe("Your weight has held steady this month.");
  });
});
