"use client";

import { ShoppingBag } from "lucide-react";
import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type CartContextValue = {
  count: number;
  openCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

// Holds the drawer open-state and exposes openCart() to anything in the tree
// (header cart button, PDP add-to-cart). The drawer body (`contents`) is a
// server-rendered node, so it always shows the authoritative cart and refreshes
// on revalidation. `count` comes from the server too.
export function CartProvider({
  count,
  contents,
  children,
}: {
  count: number;
  contents: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ count, openCart: () => setOpen(true) }), [count]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Cart</SheetTitle>
          </SheetHeader>
          {contents}
        </SheetContent>
      </Sheet>
    </CartContext.Provider>
  );
}

// Header cart icon: opens the drawer and shows the live count (hidden at 0).
export function CartButton() {
  const { count, openCart } = useCart();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={openCart}
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart, empty"}
      className="relative"
    >
      <ShoppingBag />
      {count > 0 ? (
        <Badge
          variant="accent"
          className="-right-1 -top-1 absolute size-5 justify-center rounded-full p-0 text-[10px] leading-none"
        >
          {count}
        </Badge>
      ) : null}
    </Button>
  );
}
