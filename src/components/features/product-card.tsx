import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ProductImage } from "@/components/ui/product-image";
import { formatPriceMinor } from "@/lib/money";
import type { ProductListItem } from "@/server/queries/products";

export function ProductCard({ product }: { product: ProductListItem }) {
  const inStock = product.variants.some((variant) => variant.stock > 0);
  const cover = product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
        {cover ? (
          <ProductImage
            placeholderKey={cover.placeholderKey}
            alt={cover.alt}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {inStock ? null : (
          <Badge variant="secondary" className="absolute top-3 left-3 bg-background/90">
            Out of stock
          </Badge>
        )}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <h3 className="font-medium text-sm">{product.name}</h3>
        <p className="text-muted-foreground text-sm">{formatPriceMinor(product.priceMinor)}</p>
      </div>
    </Link>
  );
}
