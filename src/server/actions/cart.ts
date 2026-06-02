"use server";

import { and, eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getCartIdFromCookie, getOrCreateCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { cartItems, productVariants } from "@/lib/db/schema";
import { CART_TAG } from "@/server/queries/cart";

export type CartActionResult = { ok: true } | { ok: false; error: string };

const addSchema = z.object({
  variantId: z.number().int().positive(),
  qty: z.number().int().positive().max(99).default(1),
});

const updateSchema = z.object({
  itemId: z.number().int().positive(),
  qty: z.number().int().min(0).max(99),
});

const removeSchema = z.object({ itemId: z.number().int().positive() });

function revalidateCart() {
  revalidateTag(CART_TAG);
}

async function getVariantStock(variantId: number): Promise<number | null> {
  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, variantId),
    columns: { stock: true },
  });
  return variant?.stock ?? null;
}

export async function addToCart(variantId: number, qty = 1): Promise<CartActionResult> {
  const parsed = addSchema.safeParse({ variantId, qty });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const stock = await getVariantStock(parsed.data.variantId);
  if (stock === null) return { ok: false, error: "Item not found." };
  if (stock <= 0) return { ok: false, error: "Out of stock." };

  const cartId = await getOrCreateCart();

  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, parsed.data.variantId)),
    columns: { id: true, quantity: true },
  });

  const desiredQty = (existing?.quantity ?? 0) + parsed.data.qty;
  if (desiredQty > stock) {
    return { ok: false, error: `Only ${stock} in stock.` };
  }

  if (existing) {
    await db.update(cartItems).set({ quantity: desiredQty }).where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({
      cartId,
      variantId: parsed.data.variantId,
      quantity: parsed.data.qty,
    });
  }

  revalidateCart();
  return { ok: true };
}

export async function updateCartItemQty(itemId: number, qty: number): Promise<CartActionResult> {
  const parsed = updateSchema.safeParse({ itemId, qty });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const cartId = await getCartIdFromCookie();
  if (cartId === null) return { ok: false, error: "No cart." };

  // Only operate on an item that belongs to this cookie's cart.
  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, parsed.data.itemId), eq(cartItems.cartId, cartId)),
    columns: { id: true, variantId: true },
  });
  if (!item) return { ok: false, error: "Item not found." };

  if (parsed.data.qty === 0) {
    await db.delete(cartItems).where(eq(cartItems.id, item.id));
    revalidateCart();
    return { ok: true };
  }

  const stock = await getVariantStock(item.variantId);
  if (stock === null) return { ok: false, error: "Item not found." };
  if (parsed.data.qty > stock) {
    return { ok: false, error: `Only ${stock} in stock.` };
  }

  await db.update(cartItems).set({ quantity: parsed.data.qty }).where(eq(cartItems.id, item.id));

  revalidateCart();
  return { ok: true };
}

export async function removeCartItem(itemId: number): Promise<CartActionResult> {
  const parsed = removeSchema.safeParse({ itemId });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const cartId = await getCartIdFromCookie();
  if (cartId === null) return { ok: false, error: "No cart." };

  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, parsed.data.itemId), eq(cartItems.cartId, cartId)));

  revalidateCart();
  return { ok: true };
}
