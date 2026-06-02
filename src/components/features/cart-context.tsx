"use client";

import { createContext, useContext } from "react";

import type { CartLine, CartView } from "@/server/queries/cart";

export type CartContextValue = {
  cart: CartView;
  open: boolean;
  openCart: () => void;
  setOpen: (open: boolean) => void;
  addItem: (line: CartLine) => void;
  setQty: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
