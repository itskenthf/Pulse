import { NextResponse } from "next/server";
import { getAllWidgets } from "@pulse/sdk";
import { readWidgetCache } from "@pulse/database";
import { auth } from "@/auth";

export type SnapshotResponse = Record<string, { data: unknown; updatedAt: string } | null>;

export const dynamic = "force-dynamic";

/**
 * The browser-callable counterpart to `WidgetSlot`'s server-side cache
 * read (apps/web/src/app/page.tsx) — lets a client component pull down
 * every widget's current `widget_cache` row for offline persistence
 * (apps/web/src/lib/offline-cache.ts). Reads `readWidgetCache` directly
 * rather than the `unstable_cache`-wrapped `readCachedWidgetCache`
 * (apps/web/src/lib/widget-data-cache.ts) — this route doesn't need to
 * participate in that tag-based revalidation, it's a one-off pull.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const widgets = getAllWidgets();
  const results = await Promise.allSettled(
    widgets.map(async (widget) => {
      const cached = await readWidgetCache(userId, widget.id, widget.dataSchema);
      return [widget.id, cached ? { data: cached.data, updatedAt: cached.updatedAt } : null] as const;
    }),
  );

  // A widget whose read rejects (e.g. a dataSchema mismatch, which
  // readWidgetCache documents as a throw) is simply omitted from the
  // response rather than failing the whole snapshot — self-heals on the
  // next successful hydration.
  const snapshot: SnapshotResponse = {};
  for (const result of results) {
    if (result.status === "fulfilled") {
      const [widgetId, entry] = result.value;
      snapshot[widgetId] = entry;
    }
  }

  return NextResponse.json(snapshot);
}
