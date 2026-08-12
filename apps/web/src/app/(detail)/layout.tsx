import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for every detail route (`/tasks`, `/notes`, `/notebook`,
 * `/timeline`, `/reading`, `/steam/[appId]`, `/health/*`) — the
 * wrapper/back-link chrome every one of these pages previously duplicated
 * by hand (see docs/DECISIONS.md's 2026-08-12 entry). A route-group
 * layout (not a URL segment — the `(detail)` folder name never appears in
 * any path) so this applies to all of them without affecting routing.
 *
 * Deliberately doesn't include the page's own `<h1>`: that text differs
 * per route and isn't known here, so each page still renders its own
 * heading inside `children`.
 *
 * No auth check here — `middleware.ts` already redirects an unauthenticated
 * request before any of this renders; each page still calls `auth()`
 * itself since it needs `session.user.id` for its own data fetch.
 */
export default function DetailLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>
        {children}
      </main>
    </div>
  );
}
