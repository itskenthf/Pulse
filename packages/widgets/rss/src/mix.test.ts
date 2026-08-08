import { describe, expect, it } from "vitest";
import { mixByPriority } from "./mix";

describe("mixByPriority", () => {
  it("gives every tier its soft cap when each has enough content", () => {
    const tiers = [
      ["g1", "g2", "g3", "g4", "g5", "g6"],
      ["a1", "a2", "a3"],
      ["h1", "h2"],
    ];
    const result = mixByPriority(tiers, 6);
    // 3 tiers, softCap = ceil(6/3) = 2 each.
    expect(result).toEqual(["g1", "g2", "a1", "a2", "h1", "h2"]);
  });

  it("backfills unused capacity to higher-priority tiers first", () => {
    const tiers = [
      ["g1", "g2", "g3", "g4", "g5", "g6"],
      ["a1"], // only 1 item, softCap is 2 — 1 slot goes unused here
      ["h1", "h2"],
    ];
    const result = mixByPriority(tiers, 6);
    // Tier 2's unused slot backfills to tier 1 (higher priority) before tier 3.
    expect(result).toEqual(["g1", "g2", "g3", "a1", "h1", "h2"]);
  });

  it("never lets one tier take every slot when others have content", () => {
    const tiers = [
      ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"],
      ["a1", "a2"],
      ["h1"],
    ];
    const result = mixByPriority(tiers, 6);
    expect(result).toContain("a1");
    expect(result).toContain("h1");
  });

  it("returns fewer than maxItems when total content is short", () => {
    const tiers = [["g1"], ["a1"]];
    expect(mixByPriority(tiers, 6)).toEqual(["g1", "a1"]);
  });

  it("returns an empty array for no tiers or a non-positive cap", () => {
    expect(mixByPriority([], 6)).toEqual([]);
    expect(mixByPriority([["g1"]], 0)).toEqual([]);
  });
});
