import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { maybeSingle, upsert, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const upsert = vi.fn();
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  const from = vi.fn(() => ({ select, upsert }));
  return { maybeSingle, upsert, from };
});

vi.mock("./client", () => ({
  createServiceClient: () => ({ from }),
}));

const { readWidgetCache, writeWidgetCache } = await import("./widget-cache");

describe("readWidgetCache", () => {
  it("returns null when no row exists", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await readWidgetCache("user-1", "hero");

    expect(result).toBeNull();
  });

  it("throws when the query itself fails", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "connection refused" } });

    await expect(readWidgetCache("user-1", "hero")).rejects.toThrow("connection refused");
  });

  it("returns the raw cast data when no schema is given (back-compat)", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { data: { anything: "goes" }, updated_at: "2026-07-27T00:00:00Z" },
      error: null,
    });

    const result = await readWidgetCache("user-1", "hero");

    expect(result).toEqual({ data: { anything: "goes" }, updatedAt: "2026-07-27T00:00:00Z" });
  });

  it("returns parsed data when it matches the given schema", async () => {
    const schema = z.object({ greeting: z.string() });
    maybeSingle.mockResolvedValueOnce({
      data: { data: { greeting: "Good morning" }, updated_at: "2026-07-27T00:00:00Z" },
      error: null,
    });

    const result = await readWidgetCache("user-1", "hero", schema);

    expect(result).toEqual({ data: { greeting: "Good morning" }, updatedAt: "2026-07-27T00:00:00Z" });
  });

  it("throws a descriptive error when the cached row no longer matches the schema", async () => {
    const schema = z.object({ greeting: z.string() });
    maybeSingle.mockResolvedValueOnce({
      // Simulates a stale cache row written under an older/different shape.
      data: { data: { greeting: 42 }, updated_at: "2026-07-27T00:00:00Z" },
      error: null,
    });

    await expect(readWidgetCache("user-1", "hero", schema)).rejects.toThrow(
      /no longer matches its expected shape/,
    );
  });
});

describe("writeWidgetCache", () => {
  it("upserts keyed on user_id/widget_id", async () => {
    upsert.mockResolvedValueOnce({ error: null });

    await writeWidgetCache("user-1", "hero", { greeting: "Good morning" });

    expect(from).toHaveBeenCalledWith("widget_cache");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        widget_id: "hero",
        data: { greeting: "Good morning" },
      }),
      { onConflict: "user_id,widget_id" },
    );
  });

  it("throws when the write fails", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "disk full" } });

    await expect(writeWidgetCache("user-1", "hero", {})).rejects.toThrow("disk full");
  });
});
