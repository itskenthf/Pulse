import { describe, expect, it } from "vitest";
import { deriveReadingMemories } from "./derive-memories";
import type { ReadingBook, ReadingData } from "./types";

function book(overrides: Partial<ReadingBook> = {}): ReadingBook {
  return {
    id: "b1",
    title: "Project Hail Mary",
    author: "Andy Weir",
    currentPage: 0,
    totalPage: 476,
    status: "reading",
    finishedAt: null,
    createdAt: "2026-08-17T00:00:00Z",
    updatedAt: "2026-08-17T00:00:00Z",
    ...overrides,
  };
}

function data(books: ReadingBook[]): ReadingData {
  return { books, fetchedAt: "2026-08-17T00:00:00Z" };
}

describe("deriveReadingMemories", () => {
  it("returns nothing for an empty book list", () => {
    expect(deriveReadingMemories(null, data([]))).toEqual([]);
  });

  it("emits a memory for a newly-added book", () => {
    expect(deriveReadingMemories(null, data([book({ title: "Project Hail Mary" })]))).toEqual([
      { title: "Started reading: Project Hail Mary" },
    ]);
  });

  it("emits a memory when a book's status flips to finished", () => {
    const previous = data([book({ id: "b1", status: "reading" })]);
    const next = data([book({ id: "b1", status: "finished" })]);

    expect(deriveReadingMemories(previous, next)).toEqual([
      { title: "Finished reading: Project Hail Mary" },
    ]);
  });

  it("does not emit a memory for progress-only updates", () => {
    const previous = data([book({ id: "b1", currentPage: 10 })]);
    const next = data([book({ id: "b1", currentPage: 50 })]);

    expect(deriveReadingMemories(previous, next)).toEqual([]);
  });

  it("does not emit a memory for a book already finished in both snapshots", () => {
    const snapshot = data([book({ id: "b1", status: "finished" })]);

    expect(deriveReadingMemories(snapshot, snapshot)).toEqual([]);
  });

  it("does not emit a memory for a book that dropped out of the list", () => {
    const previous = data([book({ id: "b1" })]);
    const next = data([]);

    expect(deriveReadingMemories(previous, next)).toEqual([]);
  });
});
