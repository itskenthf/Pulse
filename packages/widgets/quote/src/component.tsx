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
      tone="accent"
    >
      {data ? (
        <p className="text-current">{data.text}</p>
      ) : (
        <p>No quote yet — click shuffle.</p>
      )}
    </WidgetCard>
  );
}
