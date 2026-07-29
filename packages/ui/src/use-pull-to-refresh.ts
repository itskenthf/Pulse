"use client";

import { useEffect, useRef, useState } from "react";

export interface UsePullToRefreshOptions {
  /** Called once the user releases past the trigger distance. Should kick
   *  off the same refresh the caller's own manual-refresh control uses —
   *  this hook only detects the gesture, it doesn't know how to refresh
   *  anything itself. */
  onRefresh: () => void;
  /** Already-pending refresh (e.g. from a manual click) — while true, a
   *  release doesn't fire a second overlapping onRefresh. */
  pending?: boolean;
}

export interface UsePullToRefreshResult {
  /** How far the user has pulled, 0 when not pulling — drive a visual
   *  indicator's opacity/offset from this rather than a plain boolean, so
   *  the indicator tracks the gesture instead of snapping in at a fixed
   *  distance. */
  pullDistance: number;
  /** True once pullDistance has crossed the trigger threshold — the
   *  point at which releasing now would fire onRefresh. */
  armed: boolean;
}

/** Distance (px) the user must pull down before a release counts as a
 *  refresh request. Roughly matches the native pull-to-reload gesture's
 *  own feel on mobile browsers. */
const TRIGGER_DISTANCE_PX = 70;

/** Caps how far pullDistance can visually grow past the trigger point, so
 *  an unusually long drag doesn't make the indicator run away. */
const MAX_PULL_DISTANCE_PX = 120;

/**
 * Detects a touch-only pull-down-from-the-top gesture and fires onRefresh
 * on release past TRIGGER_DISTANCE_PX — the mobile equivalent of clicking
 * the logo (RefreshAllTitle). Only starts tracking a touch that begins at
 * window.scrollY === 0, since the page's `<main>` (apps/web/src/app/
 * page.tsx) has no independent scroll container of its own — the document
 * itself scrolls, so "pulling" only makes sense from the very top.
 *
 * Hand-rolled rather than a gesture library: this is the only gesture the
 * app needs, and the touch math is small — see docs/DECISIONS.md.
 */
export function usePullToRefresh({
  onRefresh,
  pending = false,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const pullDistanceRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const onRefreshRef = useRef(onRefresh);
  const pendingRef = useRef(pending);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    function setDistance(distance: number) {
      pullDistanceRef.current = distance;
      setPullDistance(distance);
    }

    function handleTouchStart(event: TouchEvent) {
      if (window.scrollY > 0 || pendingRef.current) {
        startYRef.current = null;
        return;
      }
      startYRef.current = event.touches[0]?.clientY ?? null;
    }

    function handleTouchMove(event: TouchEvent) {
      if (startYRef.current === null) return;

      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const distance = Math.max(0, currentY - startYRef.current);
      setDistance(Math.min(distance, MAX_PULL_DISTANCE_PX));
    }

    function handleTouchEnd() {
      if (startYRef.current === null) return;

      if (pullDistanceRef.current >= TRIGGER_DISTANCE_PX && !pendingRef.current) {
        onRefreshRef.current();
      }
      startYRef.current = null;
      setDistance(0);
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  return { pullDistance, armed: pullDistance >= TRIGGER_DISTANCE_PX };
}
