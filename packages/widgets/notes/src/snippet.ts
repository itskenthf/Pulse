import { SNIPPET_LENGTH } from "./constants";

/** Used by the /notes page's `NoteListRow` to show a truncated-body
 *  preview. */
export function snippet(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= SNIPPET_LENGTH) return trimmed;
  return `${trimmed.slice(0, SNIPPET_LENGTH)}…`;
}
