import { beforeEach, describe, expect, it, vi } from "vitest";

const { upsert, from } = vi.hoisted(() => {
  const upsert = vi.fn();
  const from = vi.fn(() => ({ upsert }));
  return { upsert, from };
});

vi.mock("./client", () => ({
  createServiceClient: () => ({ from }),
}));

const { ensureWidgetRegistered } = await import("./widget-registry");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ensureWidgetRegistered", () => {
  it("upserts the widget's metadata on first call", async () => {
    upsert.mockResolvedValueOnce({ error: null });

    await ensureWidgetRegistered("weather-1", "Weather", "desc");

    expect(from).toHaveBeenCalledWith("widget_registry");
    expect(upsert).toHaveBeenCalledWith(
      { id: "weather-1", name: "Weather", description: "desc" },
      { onConflict: "id" },
    );
  });

  it("skips the upsert on a later call for the same widget id — nothing changes at runtime to write", async () => {
    upsert.mockResolvedValueOnce({ error: null });

    await ensureWidgetRegistered("weather-2", "Weather");
    await ensureWidgetRegistered("weather-2", "Weather");
    await ensureWidgetRegistered("weather-2", "Weather");

    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("still upserts independently for a different widget id", async () => {
    upsert.mockResolvedValue({ error: null });

    await ensureWidgetRegistered("weather-3", "Weather");
    await ensureWidgetRegistered("steam-3", "Steam");

    expect(upsert).toHaveBeenCalledTimes(2);
  });

  it("throws on a failed upsert, and does not cache the id — the next call retries for real", async () => {
    upsert.mockResolvedValueOnce({ error: { message: "connection refused" } });

    await expect(ensureWidgetRegistered("weather-4", "Weather")).rejects.toThrow(
      "connection refused",
    );

    upsert.mockResolvedValueOnce({ error: null });
    await ensureWidgetRegistered("weather-4", "Weather");

    expect(upsert).toHaveBeenCalledTimes(2);
  });
});
