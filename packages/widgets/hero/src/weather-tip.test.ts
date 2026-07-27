import { describe, expect, it } from "vitest";
import { weatherTip } from "./weather-tip";

describe("weatherTip", () => {
  it("suggests an umbrella for rain codes", () => {
    expect(weatherTip(61, 18)).toBe("Take an umbrella.");
  });

  it("warns about fog", () => {
    expect(weatherTip(45, 12)).toBe("Drive carefully — foggy out there.");
  });

  it("suggests bundling up for snow", () => {
    expect(weatherTip(71, -2)).toBe("Bundle up, it's snowing.");
  });

  it("suggests hydration on a hot clear day", () => {
    expect(weatherTip(0, 32)).toBe("Stay hydrated out there.");
  });

  it("says nothing for a mild clear day (no forced generic tip)", () => {
    expect(weatherTip(1, 20)).toBeNull();
  });

  it("says nothing for an unrecognized code", () => {
    expect(weatherTip(999, 20)).toBeNull();
  });
});
