import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAllWidgets } from "@pulse/sdk";
import { listUserIds } from "@pulse/database";
import { refreshWidget } from "@/lib/refresh-widget";

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  // timingSafeEqual throws on length mismatch rather than returning false,
  // so a wrong-length header (the common case for any real guess) has to
  // be handled before reaching it.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const dynamic = "force-dynamic";

/**
 * Scheduler entry point (reference doc §5: cron-first, never direct).
 * Triggered by the GitHub Actions workflow rather than Vercel Cron —
 * Vercel's Hobby tier only allows daily cron jobs, too infrequent for the
 * refresh intervals in §4. See docs/DECISIONS.md.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const widgets = getAllWidgets();
  const userIds = await listUserIds();

  const results = await Promise.allSettled(
    userIds.flatMap((userId) => widgets.map((widget) => refreshWidget(widget.id, userId))),
  );

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  return NextResponse.json({
    refreshed: results.length - failures.length,
    failed: failures.length,
    errors: failures.map((failure) =>
      failure.reason instanceof Error ? failure.reason.message : "Unknown error",
    ),
  });
}
