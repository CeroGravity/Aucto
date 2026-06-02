"use client";

import { useState } from "react";

import { AddToCartButton } from "@/components/features/add-to-cart-button";
import type { Size } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/server/queries/cart";

type VariantOption = { id: number; size: Size; stock: number };

type ProductSummary = {
  slug: string;
  name: string;
  priceMinor: number;
  imageKey: string | null;
  imageAlt: string | null;
};

type SizeSelectorProps = {
  variants: VariantOption[];
  product: ProductSummary;
};

export function SizeSelector({ variants, product }: SizeSelectorProps) {
  const [selected, setSelected] = useState<Size | null>(null);
  const selectedVariant = variants.find((v) => v.size === selected) ?? null;

  const line: CartLine | null = selectedVariant
    ? {
        // Temp negative id for the optimistic insert; reconciled on revalidate.
        itemId: -selectedVariant.id,
        variantId: selectedVariant.id,
        productSlug: product.slug,
        productName: product.name,
        size: selectedVariant.size,
        unitPriceMinor: product.priceMinor,
        quantity: 1,
        stock: selectedVariant.stock,
        lineTotalMinor: product.priceMinor,
        imageKey: product.imageKey,
        imageAlt: product.imageAlt,
      }
    : null;

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-medium text-sm">Select size</legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((variant) => {
            const outOfStock = variant.stock <= 0;
            const isSelected = selected === variant.size;
            return (
              <button
                key={variant.size}
                type="button"
                disabled={outOfStock}
                aria-pressed={isSelected}
                onClick={() => setSelected(variant.size)}
                className={cn(
                  "min-w-12 rounded-md border px-4 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  outOfStock
                    ? "cursor-not-allowed border-border text-muted-foreground/40 line-through"
                    : isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/50",
                )}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </fieldset>

      <AddToCartButton line={line} />
    </div>
  );
}
