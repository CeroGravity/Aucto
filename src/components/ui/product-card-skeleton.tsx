import { Skeleton } from "@/components/ui/skeleton";

// Reusable loading placeholder mirroring a product card: image block + two
// text lines. Phase 2's catalog loading.tsx reuses this.
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
