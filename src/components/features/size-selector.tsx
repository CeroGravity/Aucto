"use client";

import { useState } from "react";

import { AddToCartButton } from "@/components/features/add-to-cart-button";
import type { Size } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type VariantOption = { id: number; size: Size; stock: number };

type SizeSelectorProps = {
  variants: VariantOption[];
};

export function SizeSelector({ variants }: SizeSelectorProps) {
  const [selected, setSelected] = useState<Size | null>(null);
  const selectedVariant = variants.find((v) => v.size === selected) ?? null;

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

      <AddToCartButton
        variantId={selectedVariant?.id ?? null}
        disabled={selectedVariant === null}
      />
    </div>
  );
}
