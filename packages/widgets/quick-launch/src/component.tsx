import { EmptyState, GLASS_CHIP, RADIUS, SPRING_PRESS, WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { QuickLaunchIcon } from "./icon";
import { LinkIcon } from "./link-icon";
import { SettingsFormFields } from "./settings-form-fields";
import type { QuickLaunchData, QuickLaunchSettings } from "./types";

export function QuickLaunchComponent({
  settings,
  actions,
}: WidgetRenderProps<QuickLaunchData, QuickLaunchSettings>) {
  const links = settings.links.filter((link) => link.label && link.url);

  return (
    <WidgetCard
      title="Quick Launch"
      icon={<QuickLaunchIcon />}
      action={
        <WidgetMenu
          id="quick-launch"
          actions={actions}
          settingsFields={<SettingsFormFields settings={settings} />}
        />
      }
    >
      {links.length > 0 ? (
        <div className="flex flex-wrap gap-2.5">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              aria-label={link.label}
              className={`flex h-11 w-11 shrink-0 items-center justify-center ${RADIUS.chip} ${GLASS_CHIP} ${SPRING_PRESS}`}
            >
              <LinkIcon url={link.url} />
            </a>
          ))}
        </div>
      ) : (
        <EmptyState message="No links yet — add some in settings." />
      )}
    </WidgetCard>
  );
}
