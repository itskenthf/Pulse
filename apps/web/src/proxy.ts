import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Centralizes the "redirect to / if not signed in" check every protected
 * page previously repeated by hand (10 identical `const session = await
 * auth(); if (!session?.user?.id) redirect("/")` blocks — see
 * docs/DECISIONS.md's 2026-08-12 entry). Each page still calls `auth()`
 * itself too, since it needs `session.user.id` for its own DB query and
 * TypeScript needs the null check to narrow that — but this is now the
 * actual security boundary: a new protected route added to `matcher`
 * below is guarded before any page code runs, rather than depending on
 * every future page remembering to add its own check.
 *
 * Named `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the file
 * convention (same behavior, same `config.matcher` shape); `middleware.ts`
 * still works but logs a deprecation warning on every build.
 */
export default auth((req) => {
  if (req.auth) return;
  return NextResponse.redirect(new URL("/", req.nextUrl.origin));
});

export const config = {
  matcher: [
    "/tasks/:path*",
    "/notes/:path*",
    "/notebook/:path*",
    "/timeline/:path*",
    "/reading/:path*",
    "/steam/:path*",
    "/health/:path*",
  ],
};
