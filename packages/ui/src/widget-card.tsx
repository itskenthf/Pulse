import { useId, type ReactNode } from "react";
import { GLASS_HOVER, glassClass } from "./glass";
import { RADIUS } from "./tokens";

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Classical is a mono-accent system (see docs/DESIGN_SYSTEM.md) — every
 * widget's icon badge shares one outlined treatment now, so the old
 * per-widget glow-color `accent` prop (blue/green/indigo/sky) was dropped
 * rather than kept as a no-op.
 */
const ACCENT_BADGE =
  "border border-[var(--color-accent-300)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)]";

/**
 * The one reusable glass card every regular widget renders itself inside
 * of, so every widget shares the same material (docs/DESIGN_SYSTEM.md).
 * Widgets own their own content — this only standardizes the chrome
 * around it. Not used by "hero"-sized widgets, which render chromeless.
 *
 * A `<section aria-labelledby>`, not a bare `<div>` — each widget is a
 * real landmark region a screen reader can jump between (e.g. VoiceOver's
 * rotor), announced by its own title instead of reading as undifferentiated
 * page content.
 */
export function WidgetCard({ title, icon, action, children }: WidgetCardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={`flex h-full min-w-0 flex-col gap-4 ${RADIUS.card} p-5 ${glassClass("light")} ${GLASS_HOVER}`}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3 text-[var(--foreground)]">
          {icon && (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center ${RADIUS.chip} ${ACCENT_BADGE}`}
            >
              {icon}
            </span>
          )}
          <h2 id={titleId} className="truncate font-heading text-sm font-semibold tracking-tight">
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="min-w-0 flex-1 text-sm text-[var(--color-neutral-600)]">{children}</div>
    </section>
  );
}
