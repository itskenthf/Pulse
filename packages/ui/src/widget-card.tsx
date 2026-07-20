import type { ReactNode } from "react";

export interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * The one reusable card every widget renders itself inside of, so mobile
 * and desktop share the same visual language (reference doc §19). Widgets
 * own their own content — this only standardizes the chrome around it.
 */
export function WidgetCard({ title, icon, action, children }: WidgetCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-zinc-950 dark:text-zinc-50">
          {icon}
          <h2 className="text-sm font-medium">{title}</h2>
        </div>
        {action}
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{children}</div>
    </div>
  );
}
