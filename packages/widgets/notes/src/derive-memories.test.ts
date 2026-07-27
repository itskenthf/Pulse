import { describe, expect, it } from "vitest";
import { deriveNoteMemories } from "./derive-memories";
import type { Note, NoteData } from "./types";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Redesign Spotify widget",
    body: "",
    createdAt: "2026-07-27T00:00:00Z",
    updatedAt: "2026-07-27T00:00:00Z",
    ...overrides,
  };
}

function data(notes: Note[]): NoteData {
  return { notes, fetchedAt: "2026-07-27T00:00:00Z" };
}

describe("deriveNoteMemories", () => {
  it("returns nothing when there are no notes", () => {
    expect(deriveNoteMemories(null, data([]))).toEqual([]);
  });

  it("emits a memory for a newly-created note", () => {
    expect(deriveNoteMemories(null, data([note({ title: "New note" })]))).toEqual([
      { title: "Created a note: New note" },
    ]);
  });

  it("does not emit a memory when an existing note's body is edited", () => {
    const previous = data([note({ id: "n1", body: "old body" })]);
    const next = data([note({ id: "n1", body: "new body" })]);

    expect(deriveNoteMemories(previous, next)).toEqual([]);
  });

  it("does not emit a memory for a note that was deleted", () => {
    const previous = data([note({ id: "n1" })]);
    const next = data([]);

    expect(deriveNoteMemories(previous, next)).toEqual([]);
  });
});
