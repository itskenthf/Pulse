import { useId, type ReactNode } from "react";
import { cardShellClass } from "./card-shell";
import { RADIUS } from "./tokens";

export type WidgetCardTagVariant = "outline" | "accent" | "neutral";

export interface WidgetCardTag {
  label: string;
  /** Matches Classical's `.tag-outline`/`.tag-accent`/`.tag-neutral` (see
   *  docs/redesign-reference) — `accent` also stands in for the mockup's
   *  `.tag-accent-2`, since Classical is a mono-accent system where the
   *  two read identically (see that system's own readme). */
  variant?: WidgetCardTagVariant;
}

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  /** Small status label next to the title — e.g. "Connected", "Top
   *  tracks", "2 played". Optional: most widgets don't need one. */
  tag?: WidgetCardTag;
  action?: ReactNode;
  children: ReactNode;
  /** Optional trailing region (e.g. a "View all →" link), visually
   *  separated from the content above it — see Tasks/Notes/Notebook. */
  footer?: ReactNode;
  /** Reduced padding/gap (16px/10px vs. the default 20px/16px) and no
   *  divider above the footer — the dashboard's Tasks/Notes/Notebook cards,
   *  which show only a compact input and a "View all →" link. */
  compact?: boolean;
}

/**
 * Classical is a mono-accent system (see docs/DESIGN_SYSTEM.md) — every
 * widget's icon badge shares one outlined treatment now, so the old
 * per-widget glow-color `accent` prop (blue/green/indigo/sky) was dropped
 * rather than kept as a no-op. Exported so other chrome that wants the
 * same "outlined accent badge" treatment (e.g. Timeline's per-entry
 * source icon) doesn't have to duplicate the class string.
 */
export const ACCENT_BADGE =
  "border border-[var(--color-accent-300)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)]";

const TAG_VARIANT: Record<WidgetCardTagVariant, string> = {
  outline: "border border-[var(--color-accent)] text-[var(--color-accent)]",
  accent: "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]",
  neutral: "bg-[var(--color-neutral-100)] text-[var(--color-neutral-800)]",
};

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
export function WidgetCard({ title, icon, tag, action, children, footer, compact = false }: WidgetCardProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cardShellClass({
        hover: true,
        padding: compact ? "p-4" : undefined,
        gap: compact ? "gap-2.5" : undefined,
      })}
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
        <div className="flex shrink-0 items-center gap-2">
          {tag && (
            <span
              className={`inline-flex items-center rounded-[3px] px-2.5 py-0.5 text-[11px] tracking-wide ${TAG_VARIANT[tag.variant ?? "neutral"]}`}
            >
              {tag.label}
            </span>
          )}
          {action}
        </div>
      </div>
      <div className="min-w-0 flex-1 text-sm text-[var(--color-neutral-600)]">{children}</div>
      {footer && (
        compact ? (
          <div>{footer}</div>
        ) : (
          <div className="border-t border-[var(--color-divider)] pt-3">{footer}</div>
        )
      )}
    </section>
  );
}
