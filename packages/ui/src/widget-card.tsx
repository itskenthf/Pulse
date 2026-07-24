import type { ReactNode } from "react";

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /**
   * "accent" inverts the card to the opposite end of the zinc scale from
   * whichever color scheme is active, giving the two-tone rhythm from the
   * design reference. Kept off `@pulse/sdk`'s Widget interface deliberately
   * — it's a per-widget rendering choice, not part of the data contract.
   */
  tone?: "default" | "accent";
}

/**
 * The one reusable card every widget renders itself inside of, so mobile
 * and desktop share the same visual language (reference doc §19). Widgets
 * own their own content — this only standardizes the chrome around it.
 */
export function WidgetCard({ title, icon, action, children, tone = "default" }: WidgetCardProps) {
  const toneClasses =
    tone === "accent"
      ? "border-zinc-950 bg-zinc-950 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
      : "border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50";
  const bodyToneClasses = tone === "accent" ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-600 dark:text-zinc-400";

  return (
    <div className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-sm ${toneClasses}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </div>
      <div className={`text-sm ${bodyToneClasses}`}>{children}</div>
    </div>
  );
}
