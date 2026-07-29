import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { maybeSingle, upsert, updateSelect, update, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const upsert = vi.fn();
  const eq2 = vi.fn(() => ({ maybeSingle }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));

  const updateSelect = vi.fn();
  const updateLt = vi.fn(() => ({ select: updateSelect }));
  const updateEq2 = vi.fn(() => ({ lt: updateLt }));
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
  const update = vi.fn(() => ({ eq: updateEq1 }));

  const from = vi.fn(() => ({ select, upsert, update }));
  return { maybeSingle, upsert, updateSelect, update, from };
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
  it("upserts unconditionally when no readAsOf is given (back-compat)", async () => {
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
    expect(update).not.toHaveBeenCalled();
  });

  it("throws when the unconditional write fails", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "disk full" } });

    await expect(writeWidgetCache("user-1", "hero", {})).rejects.toThrow("disk full");
  });

  it("with readAsOf, updates only rows older than readAsOf and skips the fallback insert once the update matched a row", async () => {
    updateSelect.mockResolvedValueOnce({ data: [{ user_id: "user-1" }], error: null });
    const upsertCallsBefore = upsert.mock.calls.length;

    await writeWidgetCache("user-1", "tasks", { tasks: [] }, "2026-07-29T00:00:00Z");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { tasks: [] } }),
    );
    expect(upsert.mock.calls.length).toBe(upsertCallsBefore);
  });

  it("with readAsOf, falls back to an ignore-duplicates insert when no row was old enough to update (first write for this widget)", async () => {
    updateSelect.mockResolvedValueOnce({ data: [], error: null });
    upsert.mockResolvedValueOnce({ error: null });

    await writeWidgetCache("user-1", "tasks", { tasks: [] }, "2026-07-29T00:00:00Z");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", widget_id: "tasks" }),
      { onConflict: "user_id,widget_id", ignoreDuplicates: true },
    );
  });

  it("never clobbers a fresher concurrent write — this is the actual bug fix: a call that read stale data (e.g. cron's fetch started before a user's task insert committed) must lose to a call that already wrote fresher data, regardless of which one's network round trip resolves last", async () => {
    // Simulates: this call's readAsOf predates a concurrent call's write,
    // so its update (`.lt("updated_at", readAsOf)`) matches nothing — the
    // existing row is already newer than what this call read as of.
    updateSelect.mockResolvedValueOnce({ data: [], error: null });
    upsert.mockResolvedValueOnce({ error: null });

    await writeWidgetCache("user-1", "tasks", { tasks: ["stale"] }, "2026-07-29T00:00:00Z");

    // The fallback insert uses ignoreDuplicates, so if the fresher row
    // already exists, Postgres silently keeps it instead of overwriting —
    // there's nothing more this test can assert client-side beyond
    // confirming that's the call shape used (not a plain upsert).
    expect(upsert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ ignoreDuplicates: true }),
    );
  });

  it("throws when the conditional update itself fails", async () => {
    updateSelect.mockResolvedValueOnce({ data: null, error: { message: "connection refused" } });

    await expect(
      writeWidgetCache("user-1", "tasks", {}, "2026-07-29T00:00:00Z"),
    ).rejects.toThrow("connection refused");
  });

  it("throws when the fallback insert fails", async () => {
    updateSelect.mockResolvedValueOnce({ data: [], error: null });
    upsert.mockResolvedValueOnce({ error: { message: "disk full" } });

    await expect(
      writeWidgetCache("user-1", "tasks", {}, "2026-07-29T00:00:00Z"),
    ).rejects.toThrow("disk full");
  });
});
