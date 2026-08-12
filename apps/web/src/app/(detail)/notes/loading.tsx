import { SkeletonHeading, SkeletonLine } from "@/app/(detail)/skeleton";

export default function NotesLoading() {
  return (
    <>
      <SkeletonHeading />
      <SkeletonLine className="h-11 w-full" />
      <div className="flex flex-col gap-3">
        <SkeletonLine className="h-20 w-full" />
        <SkeletonLine className="h-20 w-full" />
      </div>
    </>
  );
}
