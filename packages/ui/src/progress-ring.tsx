import type { ReactNode } from "react";

export interface ProgressRingProps {
  /** 0-100, clamped. */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Centered inside the ring — e.g. "62%" or "45.2kg". */
  children?: ReactNode;
}

/**
 * A stroked arc, not a filled donut — deliberately stricter than Reading/
 * Steam's sanctioned filled-bar exception (docs/DESIGN_SYSTEM.md's
 * progress-indicator note): the ring is a larger, more prominent element
 * on the Weight Tracker card and `/health/weight`, where a filled interior
 * would read as much heavier than the system's flat, hairline aesthetic
 * intends. Both the track and the progress arc are `fill="none"`.
 */
export function ProgressRing({ percent, size = 64, strokeWidth = 4, children }: ProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-divider)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
      )}
    </div>
  );
}
