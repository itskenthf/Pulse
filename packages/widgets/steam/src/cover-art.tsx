"use client";

import { useEffect, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";

/**
 * Steam's CDN serves a portrait library cover at a predictable URL from
 * just the appId — no extra API call. Not every app has one (delisted or
 * very old titles), so this falls back to a placeholder tile on failure,
 * using the same SSR-hydration-race-safe pattern as Quick Launch's
 * LinkIcon: a fast 404 can fire the native `error` event before React
 * hydrates and attaches `onError`, so `useEffect` re-checks
 * `complete && naturalWidth === 0` on mount as a backstop.
 */
export function CoverArt({ appId, name }: { appId: number; name: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) {
    return (
      <div className="flex aspect-[2/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-sky-200 to-indigo-200 shadow-sm dark:from-sky-500/20 dark:to-indigo-500/20">
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
      src={`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`}
      alt={name}
      className="aspect-[2/3] w-full rounded-2xl object-cover shadow-sm"
      onError={() => setFailed(true)}
    />
  );
}
