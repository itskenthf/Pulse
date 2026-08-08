import { DetailPageSkeleton, SkeletonLine } from "@/app/detail-page-skeleton";

export default function TimelineLoading() {
  return (
    <DetailPageSkeleton>
      <div className="flex flex-col gap-3">
        <SkeletonLine className="w-24" />
        <div className="flex flex-col divide-y divide-[var(--color-divider)] border-y border-[var(--color-divider)]">
          <SkeletonLine className="my-3 w-2/3" />
          <SkeletonLine className="my-3 w-1/2" />
          <SkeletonLine className="my-3 w-3/5" />
        </div>
      </div>
    </DetailPageSkeleton>
  );
}
