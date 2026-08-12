import { SkeletonHeading, SkeletonLine } from "@/app/(detail)/skeleton";

export default function WeightLoading() {
  return (
    <>
      <SkeletonHeading />
      <div className="flex gap-2">
        <SkeletonLine className="h-11 flex-1" />
        <SkeletonLine className="h-11 w-20" />
      </div>
      <SkeletonLine className="h-32 w-full" />
      <SkeletonLine className="h-11 w-full" />
      <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
        <SkeletonLine className="my-3 w-2/3" />
        <SkeletonLine className="my-3 w-1/2" />
      </div>
    </>
  );
}
