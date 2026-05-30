"use client";

import { Button } from "@/components/ui/button";
import type { Size } from "@/lib/db/schema";

type AddToCartButtonProps = {
  productSlug: string;
  size: Size | null;
  disabled: boolean;
};

export function AddToCartButton({ productSlug, size, disabled }: AddToCartButtonProps) {
  function handleClick() {
    // TODO(Phase 3): replace with the real add-to-cart server action.
    // Honest stub — intentionally no cart, no success message.
    console.info("[stub] add to cart", { productSlug, size });
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full sm:w-auto"
      disabled={disabled}
      onClick={handleClick}
    >
      {disabled ? "Select a size" : "Add to cart"}
    </Button>
  );
}
