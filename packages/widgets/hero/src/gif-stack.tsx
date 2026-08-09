"use client";

import { useState } from "react";
import { RADIUS } from "@pulse/ui";

/** Update whenever a new batch of images lands in apps/web/public/hero-gifs/. */
const TOTAL_IMAGES = 3;

const GIF_PATHS = Array.from({ length: TOTAL_IMAGES }, (_, i) => `/hero-gifs/${i + 1}.jpg`);

const SHADOW_LIGHT = "shadow-[0_1px_2px_color-mix(in_srgb,#2d2b2b_14%,transparent)]";
const SHADOW_MEDIUM = "shadow-[0_3px_10px_color-mix(in_srgb,#2d2b2b_16%,transparent)]";

/**
 * A small personal touch beside Hero's greeting: three overlapping cards,
 * the front one cycling through local photos. The two peek cards behind it
 * are click targets (no visible button chrome) that step the front card
 * left/right, wrapping at both ends.
 *
 * Only the active image plus its immediate neighbors are ever mounted —
 * with TOTAL_IMAGES potentially in the dozens, rendering every path as an
 * always-present <img> would mean fetching all of them on every page load.
 * Neighbors stay mounted at opacity-0 so the very next click already has
 * its image loaded, keeping the cross-fade smooth one step at a time.
 */
export function GifStack() {
  const [gifIndex, setGifIndex] = useState(0);

  const cyclePrev = () => setGifIndex((i) => (i - 1 + TOTAL_IMAGES) % TOTAL_IMAGES);
  const cycleNext = () => setGifIndex((i) => (i + 1) % TOTAL_IMAGES);

  const prevIndex = (gifIndex - 1 + TOTAL_IMAGES) % TOTAL_IMAGES;
  const nextIndex = (gifIndex + 1) % TOTAL_IMAGES;
  const visibleIndexes = Array.from(new Set([prevIndex, gifIndex, nextIndex]));

  return (
    <div className="relative h-[152px] w-[214px]">
      <button
        type="button"
        onClick={cyclePrev}
        aria-label="Previous photo"
        className={`absolute top-[11px] left-[-4px] h-[130px] w-[130px] cursor-pointer border border-[var(--color-divider)] bg-[color-mix(in_srgb,var(--color-neutral-300)_35%,var(--background))] ${RADIUS.card} ${SHADOW_LIGHT}`}
      />
      <button
        type="button"
        onClick={cycleNext}
        aria-label="Next photo"
        className={`absolute top-[11px] right-[-4px] h-[130px] w-[130px] cursor-pointer border border-[var(--color-divider)] bg-[color-mix(in_srgb,var(--color-accent-300)_35%,var(--background))] ${RADIUS.card} ${SHADOW_LIGHT}`}
      />
      <div
        className={`absolute top-0 left-1/2 z-[3] h-[152px] w-[152px] -translate-x-1/2 overflow-hidden border border-[var(--color-divider)] bg-[var(--color-accent-100)] ${RADIUS.card} ${SHADOW_MEDIUM}`}
      >
        {visibleIndexes.map((i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={GIF_PATHS[i]}
            src={GIF_PATHS[i]}
            alt=""
            aria-hidden={i !== gifIndex}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[350ms] ease-out motion-reduce:transition-none ${
              i === gifIndex ? "scale-100 opacity-100" : "pointer-events-none scale-[0.96] opacity-0"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
