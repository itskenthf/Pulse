import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readAllWidgetSnapshots, readWidgetSnapshot, writeWidgetSnapshots } from "./offline-cache";

async function resetDatabase() {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase("pulse-offline-cache");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("writeWidgetSnapshots / readWidgetSnapshot / readAllWidgetSnapshots", () => {
  it("round-trips written data, including a cachedAt timestamp", async () => {
    await writeWidgetSnapshots({
      github: { data: { streak: 3 }, updatedAt: "2026-08-17T00:00:00.000Z" },
    });

    const stored = await readWidgetSnapshot("github");

    expect(stored).not.toBeNull();
    expect(stored?.widgetId).toBe("github");
    expect(stored?.data).toEqual({ streak: 3 });
    expect(stored?.updatedAt).toBe("2026-08-17T00:00:00.000Z");
    expect(typeof stored?.cachedAt).toBe("string");
    expect(Number.isNaN(Date.parse(stored?.cachedAt ?? ""))).toBe(false);
  });

  it("skips null-valued entries", async () => {
    await writeWidgetSnapshots({
      tasks: null,
      notes: { data: { count: 1 }, updatedAt: "2026-08-17T00:00:00.000Z" },
    });

    expect(await readWidgetSnapshot("tasks")).toBeNull();
    const all = await readAllWidgetSnapshots();
    expect(all.map((s) => s.widgetId)).toEqual(["notes"]);
  });

  it("readWidgetSnapshot returns null for a widget never written", async () => {
    expect(await readWidgetSnapshot("never-written")).toBeNull();
  });

  it("readAllWidgetSnapshots returns an empty array when nothing has been written", async () => {
    expect(await readAllWidgetSnapshots()).toEqual([]);
  });
});

describe("failure fallback", () => {
  it("resolves to safe fallbacks instead of throwing when the underlying open call rejects", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const openSpy = vi.spyOn(indexedDB, "open").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    await expect(
      writeWidgetSnapshots({ github: { data: {}, updatedAt: "2026-08-17T00:00:00.000Z" } }),
    ).resolves.toBeUndefined();
    await expect(readWidgetSnapshot("github")).resolves.toBeNull();
    await expect(readAllWidgetSnapshots()).resolves.toEqual([]);

    expect(warnSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
