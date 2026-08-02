import { describe, expect, it } from "vitest";
import { formatEntryTimestamp, formatRelativeDayLabel, opacityForIndex } from "./format";

const NOW = new Date(2026, 6, 31, 15, 0, 0); // July 31, 2026, 3pm local

describe("formatRelativeDayLabel", () => {
  it("labels an entry from today as 'This morning'", () => {
    expect(formatRelativeDayLabel(new Date(2026, 6, 31, 9, 0, 0).toISOString(), NOW)).toBe(
      "This morning",
    );
  });

  it("labels an entry from yesterday as 'Yesterday'", () => {
    expect(formatRelativeDayLabel(new Date(2026, 6, 30, 20, 0, 0).toISOString(), NOW)).toBe(
      "Yesterday",
    );
  });

  it("labels an entry from two days ago as 'Two days ago'", () => {
    expect(formatRelativeDayLabel(new Date(2026, 6, 29, 8, 0, 0).toISOString(), NOW)).toBe(
      "Two days ago",
    );
  });

  it("labels an older entry with the actual date", () => {
    expect(formatRelativeDayLabel(new Date(2026, 6, 20, 8, 0, 0).toISOString(), NOW)).toBe(
      "July 20",
    );
  });
});

describe("formatEntryTimestamp", () => {
  it("shows the added time for an untouched entry", () => {
    const iso = new Date(2026, 7, 2, 10, 14, 0).toISOString();
    expect(formatEntryTimestamp({ createdAt: iso, updatedAt: iso })).toBe("Aug 2, 10:14 AM");
  });

  it("shows the edited time with an '(edited)' tag when updatedAt differs", () => {
    const createdAt = new Date(2026, 7, 2, 9, 0, 0).toISOString();
    const updatedAt = new Date(2026, 7, 2, 10, 14, 0).toISOString();
    expect(formatEntryTimestamp({ createdAt, updatedAt })).toBe("Aug 2, 10:14 AM (edited)");
  });
});

describe("opacityForIndex", () => {
  it("renders the newest entry at full strength", () => {
    expect(opacityForIndex(0)).toBe(1);
  });

  it("steps the second entry down", () => {
    expect(opacityForIndex(1)).toBe(0.75);
  });

  it("holds later entries at the lowest step", () => {
    expect(opacityForIndex(2)).toBe(0.5);
    expect(opacityForIndex(9)).toBe(0.5);
  });
});
