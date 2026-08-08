"use client";

import { useEffect, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { RADIUS } from "@pulse/ui";

/**
 * Attempt 0 is the real URL from Steam's own store metadata (see
 * fetchAppCoverArtUrl) when available — the two guessed CDN conventions
 * below don't exist for every app (esp. ones onboarded under Steam's
 * newer asset pipeline), so a game with real cover art at a different
 * path was previously shown as "No cover art" for no real reason.
 * Attempts 1/2 stay as a fallback for cache rows written before
 * `coverArtUrl` existed, or when Steam's appdetails call itself failed.
 */
export function coverArtUrlForAttempt(appId: number, realUrl: string | null, attempt: number): string {
  if (attempt === 0 && realUrl) return realUrl;
  const guessAttempt = realUrl ? attempt - 1 : attempt;
  return guessAttempt === 0
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
    : `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

/**
 * Falls back to a placeholder tile only after every attempt fails, using
 * the same SSR-hydration-race-safe pattern as Quick Launch's LinkIcon: a
 * fast 404 can fire the native `error` event before React hydrates and
 * attaches `onError`, so `useEffect` re-checks
 * `complete && naturalWidth === 0` on mount as a backstop.
 */
export function CoverArt({
  appId,
  name,
  coverArtUrl = null,
}: {
  appId: number;
  name: string;
  /** Real URL from Steam's store metadata, if fetched — see
   *  fetchAppCoverArtUrl. Omit/null to go straight to the guessed CDN
   *  conventions (e.g. for cache rows written before this field existed). */
  coverArtUrl?: string | null;
}) {
  const maxAttempts = coverArtUrl ? 3 : 2;
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      handleFailure();
    }
  }, []);

  function handleFailure() {
    setAttempt((current) => {
      if (current < maxAttempts - 1) return current + 1;
      setFailed(true);
      return current;
    });
  }

  if (failed) {
    return (
      <div
        className={`flex aspect-[16/9] w-full flex-col items-center justify-center gap-1.5 ${RADIUS.chip} border border-[var(--color-divider)] bg-[var(--color-accent-100)] transition-colors group-hover:border-[var(--color-accent)]`}
      >
        <Gamepad2 className="h-8 w-8 text-[var(--color-accent-700)]" aria-hidden="true" />
        <span className="text-xs text-[var(--color-accent-700)]">No cover art</span>
      </div>
    );
  }

  return (
    // Plain <img>: external Steam CDN cover art, decorative aspect-locked
    // tile — not worth routing through next/image's optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={coverArtUrlForAttempt(appId, coverArtUrl, attempt)}
      alt={name}
      className={`aspect-[16/9] w-full ${RADIUS.chip} border border-[var(--color-divider)] object-cover transition-colors group-hover:border-[var(--color-accent)]`}
      onError={handleFailure}
    />
  );
}
