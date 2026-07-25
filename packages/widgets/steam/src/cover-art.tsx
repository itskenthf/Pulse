"use client";

import { useEffect, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { RADIUS } from "@pulse/ui";

/** Two CDN conventions to try, in order, before giving up — some apps
 *  (esp. ones added to Steam more recently) don't have a `header.jpg` but
 *  do have a store capsule, or vice versa. Both are constructible from
 *  just the appId, no extra API call either way. */
function coverArtUrl(appId: number, attempt: number): string {
  return attempt === 0
    ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
    : `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

/**
 * Falls back to a placeholder tile only after both CDN conventions fail,
 * using the same SSR-hydration-race-safe pattern as Quick Launch's
 * LinkIcon: a fast 404 can fire the native `error` event before React
 * hydrates and attaches `onError`, so `useEffect` re-checks
 * `complete && naturalWidth === 0` on mount as a backstop.
 */
export function CoverArt({ appId, name }: { appId: number; name: string }) {
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
      if (current === 0) return 1;
      setFailed(true);
      return current;
    });
  }

  if (failed) {
    return (
      <div className={`flex aspect-[16/9] w-full items-center justify-center ${RADIUS.chip} bg-gradient-to-br from-sky-200 to-indigo-200 shadow-sm ring-1 ring-transparent transition-colors group-hover:ring-sky-400/70 dark:from-sky-500/20 dark:to-indigo-500/20 dark:group-hover:ring-sky-400/40`}>
        <Gamepad2 className="h-8 w-8 text-white/70" aria-hidden="true" />
      </div>
    );
  }

  return (
    // Plain <img>: external Steam CDN cover art, decorative aspect-locked
    // tile — not worth routing through next/image's optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={coverArtUrl(appId, attempt)}
      alt={name}
      className={`aspect-[16/9] w-full ${RADIUS.chip} object-cover shadow-sm ring-1 ring-transparent transition-colors group-hover:ring-sky-400/70 dark:group-hover:ring-sky-400/40`}
      onError={handleFailure}
    />
  );
}
