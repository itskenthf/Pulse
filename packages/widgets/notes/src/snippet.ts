import { SNIPPET_LENGTH } from "./constants";

/** Shared by the dashboard card's `NoteRow` and the /notes page's
 *  `NoteListRow` — both show the same truncated-body preview. */
export function snippet(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= SNIPPET_LENGTH) return trimmed;
  return `${trimmed.slice(0, SNIPPET_LENGTH)}…`;
}
