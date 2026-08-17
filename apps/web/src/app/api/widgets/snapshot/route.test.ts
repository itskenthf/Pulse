import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getAllWidgets, readWidgetCache } = vi.hoisted(() => ({
  auth: vi.fn(),
  getAllWidgets: vi.fn(),
  readWidgetCache: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@pulse/sdk", () => ({ getAllWidgets }));
vi.mock("@pulse/database", () => ({ readWidgetCache }));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/widgets/snapshot", () => {
  it("returns 401 when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(readWidgetCache).not.toHaveBeenCalled();
  });

  it("returns present, null, and omitted entries for each widget's read outcome", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllWidgets.mockReturnValueOnce([
      { id: "widget-ok" },
      { id: "widget-empty" },
      { id: "widget-broken" },
    ]);
    readWidgetCache
      .mockResolvedValueOnce({ data: { foo: "bar" }, updatedAt: "2026-08-17T00:00:00.000Z" })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("schema mismatch"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      "widget-ok": { data: { foo: "bar" }, updatedAt: "2026-08-17T00:00:00.000Z" },
      "widget-empty": null,
    });
    expect(body).not.toHaveProperty("widget-broken");
  });
});
