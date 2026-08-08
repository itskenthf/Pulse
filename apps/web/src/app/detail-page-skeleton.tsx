import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const PULSE_BLOCK = "animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-950/10";

/**
 * Shared shell for every `/tasks`, `/notes`, `/notebook`, `/timeline`
 * `loading.tsx` — all four pages share the exact same wrapper/back-link/
 * heading markup (see each page.tsx), so this renders that static chrome
 * verbatim (no layout shift once the real page streams in) and leaves the
 * body-specific skeleton to the caller via `children`.
 */
export function DetailPageSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-[var(--background)]">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--color-neutral-600)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
        </Link>

        <div aria-hidden="true" className={`h-8 w-32 ${PULSE_BLOCK}`} />

        {children}
      </main>
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-4 ${PULSE_BLOCK} ${className}`} />;
}
