"use client";

import { Minus, Plus, X } from "lucide-react";
import { useTransition } from "react";

import { ProductImage } from "@/components/ui/product-image";
import { formatPriceMinor } from "@/lib/money";
import { removeCartItem, updateCartItemQty } from "@/server/actions/cart";
import type { CartLine } from "@/server/queries/cart";

const stepBtn =
  "inline-flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CartItemRow({ line }: { line: CartLine }) {
  const [pending, startTransition] = useTransition();

  const setQty = (qty: number) =>
    startTransition(async () => {
      await updateCartItemQty(line.itemId, qty);
    });
  const remove = () =>
    startTransition(async () => {
      await removeCartItem(line.itemId);
    });

  const atMax = line.quantity >= line.stock;

  return (
    <div className="flex gap-4" data-testid="cart-item">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {line.imageKey ? (
          <ProductImage
            placeholderKey={line.imageKey}
            alt={line.imageAlt ?? line.productName}
            sizes="80px"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{line.productName}</p>
            <p className="text-muted-foreground text-xs">Size {line.size}</p>
          </div>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Remove ${line.productName}`}
            className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="inline-flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setQty(line.quantity - 1)}
              disabled={pending || line.quantity <= 1}
              aria-label="Decrease quantity"
              className={stepBtn}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-8 text-center text-sm tabular-nums">{line.quantity}</span>
            <button
              type="button"
              onClick={() => setQty(line.quantity + 1)}
              disabled={pending || atMax}
              aria-label="Increase quantity"
              className={stepBtn}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <p className="font-medium text-sm">{formatPriceMinor(line.lineTotalMinor)}</p>
        </div>
      </div>
    </div>
  );
}
