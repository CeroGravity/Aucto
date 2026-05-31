import Link from "next/link";

import { CartItemRow } from "@/components/features/cart-item-row";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPriceMinor } from "@/lib/money";
import { getCart } from "@/server/queries/cart";

// Shared, server-rendered cart body (used by the drawer and the /cart page).
// Re-rendered by revalidation after every mutation, so it always reflects the
// authoritative cart.
export async function CartContents() {
  const { lines, subtotalMinor } = await getCart();

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button asChild>
          <Link href="/products">Shop products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6 overflow-y-auto px-6 py-4">
        {lines.map((line) => (
          <CartItemRow key={line.itemId} line={line} />
        ))}
      </div>

      <div className="mt-auto border-border border-t px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Subtotal</span>
          <span className="font-semibold text-base">{formatPriceMinor(subtotalMinor)}</span>
        </div>
        <p className="mt-1 text-muted-foreground text-xs">
          Shipping and taxes calculated at checkout.
        </p>
        <Separator className="my-4" />
        <Button asChild size="lg" className="w-full">
          <Link href="/checkout">Checkout</Link>
        </Button>
      </div>
    </div>
  );
}
