import { BookOpen } from "lucide-react";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { WidgetRenderProps } from "@pulse/sdk";
import type { ReadingWidgetActions } from "./actions";
import { ReadingBody } from "./reading-body";
import type { ReadingData } from "./types";

export function ReadingComponent({
  data,
  actions,
}: WidgetRenderProps<ReadingData, Record<string, unknown>, ReadingWidgetActions>) {
  return (
    <WidgetCard
      title="Reading"
      icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
      action={<WidgetMenu id="reading" actions={actions} />}
      compact
    >
      <ReadingBody book={data?.book ?? null} actions={actions} />
    </WidgetCard>
  );
}
