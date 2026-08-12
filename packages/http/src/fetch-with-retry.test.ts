import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "./fetch-with-retry";

function jsonResponse(status: number): Response {
  return new Response(null, { status });
}

describe("fetchWithRetry", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
  });

  it("returns immediately on a successful response, no retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200));
    globalThis.fetch = fetchMock;

    const response = await fetchWithRetry("https://example.com");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 4xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404));
    globalThis.fetch = fetchMock;

    const response = await fetchWithRetry("https://example.com");

    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 5xx response with backoff, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503))
      .mockResolvedValueOnce(jsonResponse(200));
    globalThis.fetch = fetchMock;

    const promise = fetchWithRetry("https://example.com", { baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a thrown network error, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network error"))
      .mockResolvedValueOnce(jsonResponse(200));
    globalThis.fetch = fetchMock;

    const promise = fetchWithRetry("https://example.com", { baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries and returns the last failing response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500));
    globalThis.fetch = fetchMock;

    const promise = fetchWithRetry("https://example.com", { retries: 2, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after exhausting retries and throws the last network error", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network error"));
    globalThis.fetch = fetchMock;

    const promise = fetchWithRetry("https://example.com", { retries: 1, baseDelayMs: 10 });
    const assertion = expect(promise).rejects.toThrow("network error");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops retrying immediately once the signal aborts", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network error"));
    globalThis.fetch = fetchMock;

    const promise = fetchWithRetry("https://example.com", {
      signal: controller.signal,
      retries: 5,
      baseDelayMs: 1000,
    });
    const assertion = expect(promise).rejects.toThrow("network error");
    controller.abort(new Error("aborted"));
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
