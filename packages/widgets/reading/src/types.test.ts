import { describe, expect, it } from "vitest";
import { readingDataSchema } from "./types";

const FETCHED_AT = "2026-08-09T00:00:00Z";

const validBook = {
  id: "r1",
  title: "Project Hail Mary",
  author: "Andy Weir",
  currentPage: 120,
  totalPage: 476,
  createdAt: "2026-08-09T00:00:00Z",
  updatedAt: "2026-08-09T00:00:00Z",
};

describe("readingDataSchema", () => {
  it("accepts a well-formed cache row with a current book", () => {
    expect(readingDataSchema.safeParse({ book: validBook, fetchedAt: FETCHED_AT }).success).toBe(
      true,
    );
  });

  it("accepts a null book (nothing currently being read)", () => {
    expect(readingDataSchema.safeParse({ book: null, fetchedAt: FETCHED_AT }).success).toBe(
      true,
    );
  });

  it("rejects a row missing fetchedAt", () => {
    expect(readingDataSchema.safeParse({ book: null }).success).toBe(false);
  });

  it("rejects a book with a negative current page", () => {
    const result = readingDataSchema.safeParse({
      book: { ...validBook, currentPage: -1 },
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a book with a non-positive total page", () => {
    const result = readingDataSchema.safeParse({
      book: { ...validBook, totalPage: 0 },
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a book where a field's type has drifted", () => {
    const result = readingDataSchema.safeParse({
      book: { ...validBook, currentPage: "120" },
      fetchedAt: FETCHED_AT,
    });
    expect(result.success).toBe(false);
  });
});
