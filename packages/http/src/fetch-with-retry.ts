export interface FetchWithRetryOptions extends RequestInit {
  /** Extra attempts after the first, i.e. total attempts = retries + 1.
   *  Default 2 (3 attempts total) — small enough to stay well inside a
   *  widget's overall fetch budget (10s, see apps/web's refresh-widget.ts). */
  retries?: number;
  /** Base delay before the first retry; doubles each attempt after. */
  baseDelayMs?: number;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * A drop-in `fetch` replacement that retries transient failures with
 * exponential backoff: network errors (the request never got a response
 * at all) and 5xx server errors. 4xx responses are never retried — a bad
 * API key or a malformed request won't succeed on a second try, and
 * retrying it only delays surfacing the real error.
 *
 * Every adapter previously did a single bare `fetch()` with no retry at
 * all, so a single dropped connection failed the whole widget refresh
 * for that cycle — see docs/DECISIONS.md's 2026-08-12 entry.
 */
export async function fetchWithRetry(
  input: string | URL,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const { retries = 2, baseDelayMs = 300, ...init } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, init);
      if (response.ok || response.status < 500 || attempt === retries) {
        return response;
      }
      lastError = new Error(`Request failed: ${response.status}`);
    } catch (error) {
      if (init.signal?.aborted || attempt === retries) throw error;
      lastError = error;
    }
    await delay(baseDelayMs * 2 ** attempt, init.signal ?? undefined);
  }
  throw lastError;
}
