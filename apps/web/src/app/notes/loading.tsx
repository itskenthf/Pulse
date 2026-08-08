import { DetailPageSkeleton, SkeletonLine } from "@/app/detail-page-skeleton";

export default function NotesLoading() {
  return (
    <DetailPageSkeleton>
      <SkeletonLine className="h-11 w-full" />
      <div className="flex flex-col gap-3">
        <SkeletonLine className="h-20 w-full" />
        <SkeletonLine className="h-20 w-full" />
      </div>
    </DetailPageSkeleton>
  );
}
