import { describe, expect, it } from "vitest";
import { readingDataSchema } from "./types";

const FETCHED_AT = "2026-08-09T00:00:00Z";

const validBook = {
  id: "r1",
  title: "Project Hail Mary",
  author: "Andy Weir",
  currentPage: 120,
  totalPage: 476,
  status: "reading" as const,
  finishedAt: null,
  createdAt: "2026-08-09T00:00:00Z",
  updatedAt: "2026-08-09T00:00:00Z",
};

describe("readingDataSchema", () => {
  it("accepts a well-formed cache row with books", () => {
    expect(readingDataSchema.safeParse({ books: [validBook], fetchedAt: FETCHED_AT }).success).toBe(
      true,
    );
  });

  it("accepts an empty books list", () => {
    expect(readingDataSchema.safeParse({ books: [], fetchedAt: FETCHED_AT }).success).toBe(true);
  });

  it("accepts a finished book with a finishedAt date", () => {
    const finished = { ...validBook, status: "finished" as const, finishedAt: FETCHED_AT };
    expect(readingDataSchema.safeParse({ books: [finished], fetchedAt: FETCHED_AT }).success).toBe(
      true,
    );
  });

  it("rejects an invalid status value", () => {
    const result = readingDataSchema.safeParse({
      books: [{ ...validBook, status: "abandoned" }],
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a row missing fetchedAt", () => {
    expect(readingDataSchema.safeParse({ books: [] }).success).toBe(false);
  });

  it("rejects a book with a negative current page", () => {
    const result = readingDataSchema.safeParse({
      books: [{ ...validBook, currentPage: -1 }],
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a book with a non-positive total page", () => {
    const result = readingDataSchema.safeParse({
      books: [{ ...validBook, totalPage: 0 }],
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a book where a field's type has drifted", () => {
    const result = readingDataSchema.safeParse({
      books: [{ ...validBook, currentPage: "120" }],
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });
});
