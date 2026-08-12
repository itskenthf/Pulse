const PULSE_BLOCK = "animate-pulse motion-reduce:animate-none rounded-xl bg-zinc-950/10";

/**
 * The generic page-title placeholder every detail route's `loading.tsx`
 * shows before its own real `<h1>` streams in — the wrapper/back-link
 * chrome around it now lives in this route group's own `layout.tsx`
 * (rendered immediately, not part of the Suspense boundary `loading.tsx`
 * creates), so this only needs to cover what's actually still loading.
 */
export function SkeletonHeading() {
  return <div aria-hidden="true" className={`h-8 w-32 ${PULSE_BLOCK}`} />;
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`h-4 ${PULSE_BLOCK} ${className}`} />;
}
