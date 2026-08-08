import { Skeleton } from "@pulse/ui";

const ROW_GRID = "grid grid-cols-1 items-start gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3";
const PULSE_BLOCK = "animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-950/10";

/**
 * Shown the instant a hard/cold navigation to `/` starts, before `Home`'s
 * own `auth()` call resolves — without this, the whole page (including
 * the navbar) sat frozen with zero feedback. Mirrors WidgetGrid's actual
 * row/column classes so there's no layout shift once real data streams
 * in, using the same generic `Skeleton` every widget's own Suspense
 * boundary already falls back to.
 */
export default function DashboardLoading() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--background)]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--color-divider)] bg-[var(--background)] px-4 py-2 sm:px-6">
        <div aria-hidden="true" className={`h-6 w-20 sm:h-7 ${PULSE_BLOCK}`} />
        <div className="ml-auto flex items-center gap-3">
          <div aria-hidden="true" className={`h-9 w-9 rounded-full ${PULSE_BLOCK}`} />
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6">
        <div className="border-b border-[var(--color-divider)] px-4 pt-2 pb-2 sm:px-6 sm:pt-3 sm:pb-3">
          <Skeleton variant="hero" />
        </div>

        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 pb-4 sm:gap-6 sm:px-6 sm:pb-6">
          <div className={ROW_GRID}>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>

          <div className={ROW_GRID}>
            <div className="lg:col-span-2">
              <Skeleton />
            </div>
            <div className="flex min-w-0 flex-col gap-5 sm:gap-6 lg:row-span-2 lg:self-stretch">
              <Skeleton />
              <Skeleton />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
