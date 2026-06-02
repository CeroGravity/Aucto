"use client";

import { ShoppingBag } from "lucide-react";
import { type ReactNode, useOptimistic, useState, useTransition } from "react";

import { CartContext, useCart } from "@/components/features/cart-context";
import { CartPanel } from "@/components/features/cart-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { addToCart, removeCartItem, updateCartItemQty } from "@/server/actions/cart";
import type { CartLine, CartView } from "@/server/queries/cart";

type OptimisticAction =
  | { type: "add"; line: CartLine }
  | { type: "qty"; itemId: number; quantity: number }
  | { type: "remove"; itemId: number };

function recompute(lines: CartLine[]): CartView {
  const withTotals = lines.map((line) => ({
    ...line,
    lineTotalMinor: line.unitPriceMinor * line.quantity,
  }));
  return {
    lines: withTotals,
    subtotalMinor: withTotals.reduce((s, l) => s + l.lineTotalMinor, 0),
    count: withTotals.reduce((s, l) => s + l.quantity, 0),
  };
}

function reducer(state: CartView, action: OptimisticAction): CartView {
  switch (action.type) {
    case "add": {
      const existing = state.lines.find((l) => l.variantId === action.line.variantId);
      const lines = existing
        ? state.lines.map((l) =>
            l.variantId === action.line.variantId
              ? {
                  ...l,
                  quantity: Math.min(l.quantity + action.line.quantity, l.stock),
                }
              : l,
          )
        : [...state.lines, action.line];
      return recompute(lines);
    }
    case "qty":
      return recompute(
        state.lines.map((l) =>
          l.itemId === action.itemId ? { ...l, quantity: action.quantity } : l,
        ),
      );
    case "remove":
      return recompute(state.lines.filter((l) => l.itemId !== action.itemId));
  }
}

export function CartProvider({ cart, children }: { cart: CartView; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [optimisticCart, applyOptimistic] = useOptimistic(cart, reducer);
  const [, startTransition] = useTransition();

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function addItem(line: CartLine) {
    setOpen(true);
    startTransition(async () => {
      applyOptimistic({ type: "add", line });
      const result = await addToCart(line.variantId, line.quantity);
      if (!result.ok) notify(result.error);
    });
  }

  function setQty(itemId: number, quantity: number) {
    startTransition(async () => {
      applyOptimistic({ type: "qty", itemId, quantity });
      const result = await updateCartItemQty(itemId, quantity);
      if (!result.ok) notify(result.error);
    });
  }

  function removeItem(itemId: number) {
    startTransition(async () => {
      applyOptimistic({ type: "remove", itemId });
      const result = await removeCartItem(itemId);
      if (!result.ok) notify(result.error);
    });
  }

  return (
    <CartContext.Provider
      value={{
        cart: optimisticCart,
        open,
        setOpen,
        openCart: () => setOpen(true),
        addItem,
        setQty,
        removeItem,
      }}
    >
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Cart</SheetTitle>
          </SheetHeader>
          <CartPanel />
        </SheetContent>
      </Sheet>
      {toast ? (
        <output className="-translate-x-1/2 fixed bottom-4 left-1/2 z-[100] rounded-md bg-foreground px-4 py-2 text-background text-sm shadow-lg">
          {toast}
        </output>
      ) : null}
    </CartContext.Provider>
  );
}

export function CartButton() {
  const { cart, openCart } = useCart();
  const { count } = cart;
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
