import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, cycleQuote } = vi.hoisted(() => ({
  auth: vi.fn(),
  cycleQuote: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@pulse/widget-hero", () => ({ cycleQuote }));

const { cycleHeroQuoteAction } = await import("./hero");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cycleHeroQuoteAction", () => {
  it("returns an error when not signed in", async () => {
    auth.mockResolvedValueOnce(null);

    const result = await cycleHeroQuoteAction({}, new FormData());

    expect(result).toEqual({ error: "Not signed in" });
    expect(cycleQuote).not.toHaveBeenCalled();
  });

  it("returns the new quote directly in the action state, not just a bare success", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    cycleQuote.mockResolvedValueOnce({ quote: "Slow is smooth, smooth is fast." });

    const result = await cycleHeroQuoteAction({}, new FormData());

    expect(cycleQuote).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ quote: "Slow is smooth, smooth is fast." });
  });

  it("surfaces the underlying error message when cycling fails", async () => {
    auth.mockResolvedValueOnce({ user: { id: "user-1" } });
    cycleQuote.mockRejectedValueOnce(new Error("connection refused"));

    const result = await cycleHeroQuoteAction({}, new FormData());

    expect(result).toEqual({ error: "connection refused" });
  });
});
