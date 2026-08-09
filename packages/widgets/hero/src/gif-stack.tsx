"use client";

import { useState } from "react";
import { RADIUS } from "@pulse/ui";

const GIF_PATHS = ["/hero-gifs/1.gif", "/hero-gifs/2.gif", "/hero-gifs/3.gif"];

const SHADOW_LIGHT = "shadow-[0_1px_2px_color-mix(in_srgb,#2d2b2b_14%,transparent)]";
const SHADOW_MEDIUM = "shadow-[0_3px_10px_color-mix(in_srgb,#2d2b2b_16%,transparent)]";

/**
 * A small personal touch beside Hero's greeting: three overlapping cards,
 * the front one cycling through local GIFs. The two peek cards behind it
 * are click targets (no visible button chrome) that step the front card
 * left/right, wrapping at both ends.
 */
export function GifStack() {
  const [gifIndex, setGifIndex] = useState(0);

  const cyclePrev = () => setGifIndex((i) => (i - 1 + GIF_PATHS.length) % GIF_PATHS.length);
  const cycleNext = () => setGifIndex((i) => (i + 1) % GIF_PATHS.length);

  return (
    <div className="relative h-[152px] w-[214px]">
      <button
        type="button"
        onClick={cyclePrev}
        aria-label="Previous GIF"
        className={`absolute top-[11px] left-[-4px] h-[130px] w-[130px] cursor-pointer border border-[var(--color-divider)] bg-[color-mix(in_srgb,var(--color-neutral-300)_35%,var(--background))] ${RADIUS.card} ${SHADOW_LIGHT}`}
      />
      <button
        type="button"
        onClick={cycleNext}
        aria-label="Next GIF"
        className={`absolute top-[11px] right-[-4px] h-[130px] w-[130px] cursor-pointer border border-[var(--color-divider)] bg-[color-mix(in_srgb,var(--color-accent-300)_35%,var(--background))] ${RADIUS.card} ${SHADOW_LIGHT}`}
      />
      <div
        className={`absolute top-0 left-1/2 z-[3] h-[152px] w-[152px] -translate-x-1/2 overflow-hidden border border-[var(--color-divider)] bg-[var(--color-accent-100)] ${RADIUS.card} ${SHADOW_MEDIUM}`}
      >
        {GIF_PATHS.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
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
