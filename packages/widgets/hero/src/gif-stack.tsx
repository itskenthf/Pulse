"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import Image from "next/image";
import { RADIUS } from "@pulse/ui";

/** Update whenever a new batch of images lands in apps/web/public/hero-gifs/. */
const TOTAL_IMAGES = 61;

const GIF_PATHS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/hero-gifs/${i + 1}.jpg`);

const TRANSITION_MS = 280;

const SHADOW_LIGHT = "shadow-[0_1px_2px_color-mix(in_srgb,#2d2b2b_14%,transparent)]";
const SHADOW_MEDIUM = "shadow-[0_3px_10px_color-mix(in_srgb,#2d2b2b_16%,transparent)]";
const SHADOW_HEAVY_HOVER = "motion-safe:hover:shadow-[0_12px_32px_color-mix(in_srgb,#2d2b2b_22%,transparent)]";

const TINT_NEUTRAL = "bg-[color-mix(in_srgb,var(--color-neutral-300)_55%,transparent)]";

/** Swipe must beat this horizontal distance, and beat vertical drift, to count as a cycle. */
const SWIPE_THRESHOLD_PX = 40;

type Role = "main" | "peek-left" | "peek-right" | "exit-left" | "exit-right";

/**
 * Slot geometry for each role, relative to the 260x184 container. Every
 * role animates the same layout properties (top/left/width/height/
 * opacity/z-index) so a card sliding from one slot to another is a plain
 * CSS transition on the same DOM element — no transform/scale math.
 */
const SLOT_CLASSES: Record<Role, string> = {
  main: "top-0 left-[38px] h-[184px] w-[184px] z-[3] opacity-100",
  "peek-left": "top-[13px] left-[-5px] h-[156px] w-[156px] z-[1] opacity-100 cursor-pointer",
  "peek-right": "top-[13px] left-[109px] h-[156px] w-[156px] z-[1] opacity-100 cursor-pointer",
  "exit-left": "top-[25px] left-[-65px] h-[133px] w-[133px] z-0 opacity-0",
  "exit-right": "top-[25px] left-[169px] h-[133px] w-[133px] z-0 opacity-0",
};

/**
 * A small personal touch beside Hero's greeting: three overlapping cards,
 * the front one cycling through local photos. The two peek cards show the
 * actual prev/next photo (dimmed under a tint overlay) instead of a flat
 * color block. Clicking a peek card slides it into the main slot while the
 * old main card slides out to the opposite peek slot and the far card
 * exits off-stage — a real stack shuffle, not just a cross-fade in place.
 *
 * Only the active image plus its immediate neighbors are ever mounted in
 * steady state (a fourth briefly while a card is exiting) — with
 * TOTAL_IMAGES potentially in the dozens, mounting every path at once
 * would mean fetching all of them on every page load.
 */
export function GifStack() {
  const [gifIndex, setGifIndex] = useState(0);
  const [exiting, setExiting] = useState<{ index: number; side: "left" | "right" } | null>(null);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, []);

  const prevIndex = (gifIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;
  const nextIndex = (gifIndex + 1) % TOTAL_IMAGES;

  const scheduleExitClear = () => {
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => setExiting(null), TRANSITION_MS);
  };

  const cyclePrev = () => {
    setExiting({ index: nextIndex, side: "right" });
    setGifIndex((i) => (i - 1 + TOTAL_IMAGES) % TOTAL_IMAGES);
    scheduleExitClear();
  };

  const cycleNext = () => {
    setExiting({ index: prevIndex, side: "left" });
    setGifIndex((i) => (i + 1) % TOTAL_IMAGES);
    scheduleExitClear();
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) cycleNext();
    else cyclePrev();
  };

  const roleOf = (index: number): Role | null => {
    if (index === gifIndex) return "main";
    if (index === prevIndex) return "peek-left";
    if (index === nextIndex) return "peek-right";
    if (exiting?.index === index) return exiting.side === "left" ? "exit-left" : "exit-right";
    return null;
  };

  const visibleIndexes = Array.from(
    new Set([prevIndex, gifIndex, nextIndex, ...(exiting ? [exiting.index] : [])]),
  );

  return (
    <div
      className="relative h-[184px] w-[260px]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {visibleIndexes.map((i) => {
        const role = roleOf(i);
        if (!role) return null;

        const isPeek = role === "peek-left" || role === "peek-right";
        const isMain = role === "main";
        const isTinted = role === "peek-left" || role === "peek-right" || role === "exit-left" || role === "exit-right";

        return (
          <button
            key={GIF_PATHS[i]}
            type="button"
            disabled={!isPeek}
            aria-hidden={!isMain}
            aria-label={
              role === "peek-left" ? "Previous photo" : role === "peek-right" ? "Next photo" : undefined
            }
            onClick={role === "peek-left" ? cyclePrev : role === "peek-right" ? cycleNext : undefined}
            className={`absolute overflow-hidden border border-[var(--color-divider)] bg-[var(--color-accent-100)] ${RADIUS.card} ${
              isMain ? `${SHADOW_MEDIUM} ${SHADOW_HEAVY_HOVER}` : SHADOW_LIGHT
            } transition-[top,left,width,height,opacity,box-shadow] duration-[280ms] ease-out motion-reduce:transition-none ${SLOT_CLASSES[role]}`}
          >
            <Image
              src={GIF_PATHS[i]!}
              alt=""
              fill
              // Largest slot (main) is 184px square — no role here ever
              // renders bigger, so this is the real upper bound, not a
              // generic guess.
              sizes="184px"
              className="object-cover"
            />
            {isTinted && <div className={`absolute inset-0 ${TINT_NEUTRAL}`} />}
          </button>
        );
      })}
    </div>
  );
}
