import type { Widget } from "@pulse/sdk";
import type { NoteWidgetActions } from "./actions";
import { WIDGET_ID, WIDGET_NAME } from "./constants";
import { NotesComponent } from "./component";
import { deriveNoteMemories } from "./derive-memories";
import { fetchNoteData } from "./fetch";
import { noteDataSchema, type NoteData } from "./types";

export const notesWidget: Widget<NoteData, Record<string, unknown>, NoteWidgetActions> = {
  id: WIDGET_ID,
  name: WIDGET_NAME,
  size: "sm",
  refreshInterval: 900, // 15 min — self-healing backstop; mutations refresh instantly on their own
  fetchData: fetchNoteData,
  dataSchema: noteDataSchema,
  render: NotesComponent,
  permissions: () => [],
  deriveMemories: deriveNoteMemories,
};
