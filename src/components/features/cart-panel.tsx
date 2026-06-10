"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCart } from "@/components/features/cart-context";
import { CartItemRow } from "@/components/features/cart-item-row";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatPriceMinor } from "@/lib/money";

// Matches the Sheet's slide-out duration (data-[state=closed]:duration-300).
const DRAWER_EXIT_MS = 300;

// Shared cart body for the drawer and the /cart page. Reads the optimistic cart
// from context so both update in the same tick as a mutation.
export function CartPanel() {
  const { cart, open, setOpen } = useCart();
  const router = useRouter();

  // Checkout: when the drawer is open, play its slide-out exit first, THEN
  // navigate — so the user sees a smooth close into /checkout, not a snap. On
  // the /cart page the drawer is closed, so we navigate immediately.
  function goToCheckout(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!open) return; // /cart page — let the Link navigate normally.
    e.preventDefault();
    setOpen(false);
    window.setTimeout(() => router.push("/checkout"), DRAWER_EXIT_MS);
  }

  if (cart.lines.length === 0) {
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
        {cart.lines.map((line) => (
          <CartItemRow key={line.variantId} line={line} />
        ))}
      </div>

      <div className="mt-auto border-border border-t px-6 py-5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Subtotal</span>
          <span className="font-semibold text-base">{formatPriceMinor(cart.subtotalMinor)}</span>
        </div>
        <p className="mt-1 text-muted-foreground text-xs">
          Shipping and taxes calculated at checkout.
        </p>
        <Separator className="my-4" />
        <Button asChild size="lg" className="w-full">
          <Link href="/checkout" onClick={goToCheckout}>
            Checkout
          </Link>
        </Button>
      </div>
    </div>
  );
}
