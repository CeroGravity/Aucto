"use client";

import { useCart } from "@/components/features/cart-context";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/server/queries/cart";

// `line` is the fully-formed optimistic cart line for the selected size (null
// until a size is chosen). Adding is instant via the optimistic cart.
export function AddToCartButton({ line }: { line: CartLine | null }) {
  const { addItem } = useCart();
  const disabled = line === null;

  return (
    <Button
      type="button"
      size="lg"
      className="w-full sm:w-auto"
      disabled={disabled}
      onClick={() => {
        if (line) addItem(line);
      }}
    >
      {disabled ? "Select a size" : "Add to cart"}
    </Button>
  );
}
