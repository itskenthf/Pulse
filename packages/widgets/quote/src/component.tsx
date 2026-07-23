import { ActionForm, WidgetCard } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import { QuoteIcon } from "./icon";
import type { QuoteData } from "./types";

export function QuoteComponent({
  data,
  actions,
}: WidgetRenderProps<QuoteData, Record<string, unknown>>) {
  return (
    <WidgetCard
      title="Quote"
      icon={<QuoteIcon />}
      action={<ActionForm action={actions.refresh} submitLabel="Shuffle" />}
    >
      {data ? (
        <p className="text-zinc-950 dark:text-zinc-50">{data.text}</p>
      ) : (
        <p>No quote yet — click shuffle.</p>
      )}
    </WidgetCard>
  );
}
