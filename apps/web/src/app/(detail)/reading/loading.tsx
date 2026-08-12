import { SkeletonHeading, SkeletonLine } from "@/app/(detail)/skeleton";

export default function ReadingLoading() {
  return (
    <>
      <SkeletonHeading />
      <div className="flex flex-col gap-2 sm:flex-row">
        <SkeletonLine className="h-11 flex-1" />
        <SkeletonLine className="h-11 flex-1" />
        <SkeletonLine className="h-11 w-full sm:w-32" />
      </div>
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        <SkeletonLine className="my-3 w-2/3" />
        <SkeletonLine className="my-3 w-1/2" />
      </div>
    </>
  );
}
