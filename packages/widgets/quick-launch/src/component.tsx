import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { QuickLaunchIcon } from "./icon";
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
      action={<ActionForm action={actions.refresh} submitLabel="Refresh" variant="icon" />}
    >
      {links.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-950 hover:underline dark:text-zinc-50"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No links yet — add some in settings.</p>
      )}

      {actions.updateSettings && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 dark:text-zinc-500">
            Settings
          </summary>
          <ActionForm action={actions.updateSettings} submitLabel="Save" className="mt-2">
            <SettingsFormFields settings={settings} />
          </ActionForm>
        </details>
      )}
    </WidgetCard>
  );
}
