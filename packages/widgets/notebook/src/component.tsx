import type { WidgetRenderProps } from "@pulse/sdk";
import type { NotebookWidgetActions } from "./actions";
import { NotebookCard } from "./notebook-card";
import type { NotebookData } from "./types";

export function NotebookComponent({
  actions,
}: WidgetRenderProps<NotebookData, Record<string, unknown>, NotebookWidgetActions>) {
  return <NotebookCard actions={actions} />;
}
