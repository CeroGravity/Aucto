import { Container } from "@/components/ui/container";
import { ProductCardSkeleton } from "@/components/ui/product-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

const placeholders = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function Loading() {
  return (
    <Container className="py-12 md:py-16">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex flex-wrap gap-2">
          {["all", "c1", "c2", "c3", "c4"].map((id) => (
            <Skeleton key={id} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {placeholders.map((id) => (
          <ProductCardSkeleton key={id} />
        ))}
      </div>
    </Container>
  );
}
