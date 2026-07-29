import { describe, expect, it } from "vitest";
import { noteDataSchema } from "./types";

const validData = {
  notes: [
    {
      id: "n1",
      title: "Redesign Spotify widget",
      body: "Move top artist to the top.",
      createdAt: "2026-07-27T00:00:00Z",
      updatedAt: "2026-07-27T00:00:00Z",
    },
  ],
  fetchedAt: "2026-07-27T00:00:00Z",
};

describe("noteDataSchema", () => {
  it("accepts a well-formed cache row", () => {
    expect(noteDataSchema.safeParse(validData).success).toBe(true);
  });

  it("accepts an empty notes list", () => {
    expect(noteDataSchema.safeParse({ notes: [], fetchedAt: validData.fetchedAt }).success).toBe(
      true,
    );
  });

  it("rejects a row missing a required field", () => {
    const { fetchedAt: _fetchedAt, ...withoutFetchedAt } = validData;
    expect(noteDataSchema.safeParse(withoutFetchedAt).success).toBe(false);
  });

  it("rejects a note where a field's type has drifted", () => {
    const result = noteDataSchema.safeParse({
      ...validData,
      notes: [{ ...validData.notes[0], body: 42 }],
    });
    expect(result.success).toBe(false);
  });
});
