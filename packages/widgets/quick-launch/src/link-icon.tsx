"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";

/**
 * Fetches the link's own domain favicon.ico directly — no third-party
 * favicon proxy, same trust boundary as visiting the site yourself. Falls
 * back to a generic icon on load failure (not every site serves one at
 * that exact path).
 *
 * The image starts loading from the server-rendered HTML before React
 * hydrates — a fast failure (e.g. no favicon.ico at all) can fire the
 * native error event before hydration attaches `onError`, so that error
 * is silently missed. The `useEffect` below catches that race by checking
 * `complete && naturalWidth === 0` (the DOM's own signal for "finished
 * loading, but failed") right after mount, in addition to `onError`
 * handling normal post-hydration failures.
 */
export function LinkIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = null;
  }

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed || !hostname) {
    return <Link2 className="h-5 w-5 text-[var(--color-neutral-400)]" aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={`https://${hostname}/favicon.ico`}
      alt=""
      width={24}
      height={24}
      className="h-6 w-6 object-contain"
      onError={() => setFailed(true)}
    />
  );
}
