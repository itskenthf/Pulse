import type { WidgetRenderProps } from "@pulse/sdk";
import type { NotebookWidgetActions } from "./actions";
import { NotebookCard } from "./notebook-card";
import type { NotebookData } from "./types";

export function NotebookComponent({
  data,
  actions,
}: WidgetRenderProps<NotebookData, Record<string, unknown>, NotebookWidgetActions>) {
  return <NotebookCard entries={data?.entries ?? []} actions={actions} />;
}
