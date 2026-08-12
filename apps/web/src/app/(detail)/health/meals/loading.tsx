import { SkeletonHeading, SkeletonLine } from "@/app/(detail)/skeleton";

export default function MealsLoading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonLine className="h-4 w-24" />
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        <SkeletonLine className="my-3 w-1/2" />
        <SkeletonLine className="my-3 w-1/2" />
        <SkeletonLine className="my-3 w-1/2" />
        <SkeletonLine className="my-3 w-1/2" />
      </div>
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        <SkeletonLine className="my-3 w-2/3" />
        <SkeletonLine className="my-3 w-1/2" />
      </div>
    </>
  );
}
