"use client";

import { useState, useTransition } from "react";

import { useCart } from "@/components/features/cart-drawer";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/server/actions/cart";

type AddToCartButtonProps = {
  variantId: number | null;
  disabled: boolean;
};

export function AddToCartButton({ variantId, disabled }: AddToCartButtonProps) {
  const { openCart } = useCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (variantId === null) return;
    setError(null);
    startTransition(async () => {
      const result = await addToCart(variantId, 1);
      if (result.ok) {
        openCart();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={disabled || pending}
        onClick={handleClick}
      >
        {disabled ? "Select a size" : pending ? "Adding…" : "Add to cart"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
