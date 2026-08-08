import { Rss } from "lucide-react";
import { EmptyState, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { formatRelativeTime } from "./format";
import { SettingsFormFields } from "./settings-form-fields";
import type { RssData, RssSettings } from "./types";

export function RssComponent({
  data,
  settings,
  actions,
}: WidgetRenderProps<RssData, RssSettings>) {
  return (
    <WidgetCard
      title="RSS"
      icon={<Rss className="h-4 w-4" aria-hidden="true" />}
      action={
        <WidgetMenu
          id="rss"
          actions={actions}
          settingsFields={<SettingsFormFields settings={settings} />}
        />
      }
    >
      {data && data.items.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {data.items.map((item) => (
            <li key={item.link}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 w-full flex-col items-start justify-center gap-0.5 rounded-[4px] px-1 py-1 hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
              >
                <span className="w-full truncate text-sm font-medium text-[var(--foreground)]">
                  {item.title}
                </span>
                <span className="w-full truncate text-xs text-[var(--color-neutral-500)]">
                  {item.sourceName} · {formatRelativeTime(item.publishedAt)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No posts yet — click refresh to check your feeds." />
      )}
    </WidgetCard>
  );
}
