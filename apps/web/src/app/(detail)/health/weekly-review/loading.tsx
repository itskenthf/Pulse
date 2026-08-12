import { SkeletonHeading, SkeletonLine } from "@/app/(detail)/skeleton";

export default function WeeklyReviewLoading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonLine className="w-40" />
      <div className="flex flex-col gap-3">
        <SkeletonLine className="h-20 w-full" />
        <SkeletonLine className="h-20 w-full" />
      </div>
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        <SkeletonLine className="my-3 w-2/3" />
        <SkeletonLine className="my-3 w-1/2" />
      </div>
    </>
  );
}
