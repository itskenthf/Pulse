"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import { WidgetCard, WidgetMenu } from "@pulse/ui";
import type { NotebookWidgetActions } from "./actions";
import { NotebookEntryList } from "./notebook-entry-list";
import { NotebookInput } from "./notebook-input";
import type { NotebookEntry } from "./types";

/** Fades in while a save is pending and lingers briefly after it settles,
 *  so a fast save doesn't just blink. No toast, no "Saved" text — the
 *  dot alone is the whole indicator (see the widget spec). */
const SAVED_LINGER_MS = 600;

export function NotebookCard({
  entries,
  actions,
}: {
  entries: NotebookEntry[];
  actions: NotebookWidgetActions;
}) {
  const [dotVisible, setDotVisible] = useState(false);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePendingChange = useCallback((pending: boolean) => {
    if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);

    if (pending) {
      setDotVisible(true);
      return;
    }

    lingerTimerRef.current = setTimeout(() => setDotVisible(false), SAVED_LINGER_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    };
  }, []);

  return (
    <WidgetCard
      title="Notebook"
      icon={<NotebookPen className="h-4 w-4" aria-hidden="true" />}
      action={
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)] transition-opacity duration-500 ${
              dotVisible ? "opacity-50" : "opacity-0"
            }`}
          />
          <WidgetMenu id="notebook" actions={actions} />
        </div>
      }
      footer={
        <a
          href="/notebook"
          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
        >
          View all →
        </a>
      }
    >
      <div className="flex flex-col gap-4">
        <NotebookInput actions={actions} onPendingChange={handlePendingChange} />
        <NotebookEntryList entries={entries} />
      </div>
    </WidgetCard>
  );
}
