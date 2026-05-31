import { asc, eq } from "drizzle-orm";
import { getCartIdFromCookie } from "@/lib/cart";
import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";

export type CartLine = {
  itemId: number;
  variantId: number;
  productSlug: string;
  productName: string;
  size: string;
  unitPriceMinor: number;
  quantity: number;
  stock: number;
  lineTotalMinor: number;
  imageKey: string | null;
  imageAlt: string | null;
};

export type CartView = {
  lines: CartLine[];
  subtotalMinor: number;
  count: number;
};

const EMPTY: CartView = { lines: [], subtotalMinor: 0, count: 0 };

export async function getCart(): Promise<CartView> {
  const cartId = await getCartIdFromCookie();
  if (cartId === null) return EMPTY;

  // One relational query: items → variant → product (+ first image).
  const rows = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId),
    orderBy: (item) => [asc(item.createdAt)],
    with: {
      variant: {
        with: {
          product: {
            with: {
              images: { orderBy: (img, { asc: a }) => [a(img.position)], limit: 1 },
            },
          },
        },
      },
    },
  });

  const lines: CartLine[] = rows.map((row) => {
    const product = row.variant.product;
    const cover = product.images[0];
    const unitPriceMinor = product.priceMinor;
    return {
      itemId: row.id,
      variantId: row.variantId,
      productSlug: product.slug,
      productName: product.name,
      size: row.variant.size,
      unitPriceMinor,
      quantity: row.quantity,
      stock: row.variant.stock,
      lineTotalMinor: unitPriceMinor * row.quantity,
      imageKey: cover?.placeholderKey ?? null,
      imageAlt: cover?.alt ?? null,
    };
  });

  const subtotalMinor = lines.reduce((sum, l) => sum + l.lineTotalMinor, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  return { lines, subtotalMinor, count };
}

export async function getCartCount(): Promise<number> {
  const cartId = await getCartIdFromCookie();
  if (cartId === null) return 0;

  const rows = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId),
    columns: { quantity: true },
  });
  return rows.reduce((sum, r) => sum + r.quantity, 0);
}
