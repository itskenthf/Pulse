import { glassClass, RADIUS } from "@pulse/ui";
import { SkeletonHeading, SkeletonLine } from "@/app/(detail)/skeleton";

export default function SteamGameLoading() {
  return (
    <>
      <SkeletonHeading />
      <div className={`flex flex-col gap-6 ${RADIUS.card} p-6 ${glassClass("light")}`}>
        <div
          aria-hidden="true"
          className="aspect-[600/900] w-full max-w-56 animate-pulse rounded-[4px] bg-zinc-950/10 motion-reduce:animate-none"
        />
        <div className="flex flex-1 flex-col gap-5">
          <SkeletonLine className="h-7 w-2/3" />
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <SkeletonLine className="w-24" />
            <SkeletonLine className="w-24" />
            <SkeletonLine className="w-24" />
          </div>
        </div>
      </div>
    </>
  );
}
