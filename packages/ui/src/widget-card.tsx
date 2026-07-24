import type { ReactNode } from "react";

export type WidgetCardAccent = "blue" | "green" | "indigo" | "none";

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  /** A thin colored left border, giving each widget a distinct visual
   *  identity instead of every card looking identically white. Purely a
   *  rendering choice each widget makes for itself — not part of the SDK's
   *  Widget interface. */
  accent?: WidgetCardAccent;
}

const ACCENT_BORDER: Record<WidgetCardAccent, string> = {
  blue: "border-l-4 border-l-sky-400",
  green: "border-l-4 border-l-emerald-500",
  indigo: "border-l-4 border-l-indigo-600",
  none: "",
};

/**
 * The one reusable card every widget renders itself inside of, so mobile
 * and desktop share the same visual language (reference doc §19). Widgets
 * own their own content — this only standardizes the chrome around it.
 */
export function WidgetCard({ title, icon, action, children, accent = "none" }: WidgetCardProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm shadow-blue-950/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90 ${ACCENT_BORDER[accent]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-zinc-950 dark:text-zinc-50">
          {icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
              {icon}
            </span>
          )}
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{children}</div>
    </div>
  );
}
