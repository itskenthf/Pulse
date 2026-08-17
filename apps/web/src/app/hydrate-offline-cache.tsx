"use client";

import { useEffect } from "react";
import { writeWidgetSnapshots } from "@/lib/offline-cache";
import type { SnapshotResponse } from "./api/widgets/snapshot/route";

/**
 * Passive, once-per-page-load hydration of the browser's offline widget
 * cache (apps/web/src/lib/offline-cache.ts) from the snapshot API route.
 * Infra only — nothing reads this cache back yet; that's a later,
 * separate offline-UI phase. Mirrors RegisterServiceWorker's shape (the
 * only existing precedent for a client component that does something
 * once per page load, apps/web/src/app/register-service-worker.tsx).
 */
export function HydrateOfflineCache() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    let cancelled = false;
    fetch("/api/widgets/snapshot")
      .then((res) => (res.ok ? (res.json() as Promise<SnapshotResponse>) : null))
      .then((snapshot) => {
        if (!cancelled && snapshot) return writeWidgetSnapshots(snapshot);
      })
      .catch(() => {
        // Passive enhancement — a failed hydration must never surface to the user.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
