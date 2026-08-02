import type { WidgetRenderProps } from "@pulse/sdk";
import type { NoteWidgetActions } from "./actions";
import { NotesCard } from "./notes-card";
import type { NoteData } from "./types";

export function NotesComponent({
  actions,
}: WidgetRenderProps<NoteData, Record<string, unknown>, NoteWidgetActions>) {
  return <NotesCard actions={actions} />;
}
