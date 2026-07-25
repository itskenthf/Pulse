import type { ReactNode } from "react";
import { GLASS_HOVER, glassClass } from "./glass";
import { RADIUS } from "./tokens";

export type WidgetCardAccent = "blue" | "green" | "indigo" | "sky" | "none";

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** Identity comes from a soft glow behind the icon badge, not a border —
   *  see docs/DESIGN_SYSTEM.md. Purely a rendering choice each widget makes
   *  for itself, not part of the SDK's Widget interface. */
  accent?: WidgetCardAccent;
}

const ACCENT_BADGE: Record<WidgetCardAccent, string> = {
  blue: "bg-sky-100 text-sky-600 shadow-[0_0_24px_-4px_rgba(56,189,248,0.5)] dark:bg-sky-500/10 dark:text-sky-300",
  green:
    "bg-emerald-100 text-emerald-600 shadow-[0_0_24px_-4px_rgba(16,185,129,0.5)] dark:bg-emerald-500/10 dark:text-emerald-300",
  indigo:
    "bg-indigo-100 text-indigo-600 shadow-[0_0_24px_-4px_rgba(99,102,241,0.5)] dark:bg-indigo-500/10 dark:text-indigo-300",
  sky: "bg-sky-100 text-sky-600 shadow-[0_0_24px_-4px_rgba(56,189,248,0.5)] dark:bg-sky-500/10 dark:text-sky-300",
  none: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

/**
 * The one reusable glass card every regular widget renders itself inside
 * of, so every widget shares the same material (docs/DESIGN_SYSTEM.md).
 * Widgets own their own content — this only standardizes the chrome
 * around it. Not used by "hero"-sized widgets, which render chromeless.
 */
export function WidgetCard({ title, icon, action, children, accent = "none" }: WidgetCardProps) {
  return (
    <div
      className={`flex h-full flex-col gap-4 ${RADIUS.card} p-5 ${glassClass("light")} ${GLASS_HOVER}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-zinc-950 dark:text-zinc-50">
          {icon && (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center ${RADIUS.chip} ${ACCENT_BADGE[accent]}`}
            >
              {icon}
            </span>
          )}
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </div>
      <div className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">{children}</div>
    </div>
  );
}
