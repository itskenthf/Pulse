import { DetailPageSkeleton, SkeletonLine } from "@/app/detail-page-skeleton";

export default function NotebookLoading() {
  return (
    <DetailPageSkeleton>
      <SkeletonLine className="h-24 w-full" />
      <div className="flex flex-col gap-4">
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-5/6" />
        <SkeletonLine className="w-2/3" />
      </div>
    </DetailPageSkeleton>
  );
}
