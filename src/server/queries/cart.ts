import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { getCartIdFromCookie } from "@/lib/cart";
import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";

export const CART_TAG = "cart";

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

// Cached + tagged per cart id (cookie resolved outside the cache, since
// unstable_cache can't read cookies). Busted via revalidateTag(CART_TAG) after
// every mutation. The relational query loads items → variant → product (+ first
// image) in ONE query (no N+1).
const loadCart = unstable_cache(
  async (cartId: number): Promise<CartView> => {
    const rows = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cartId),
      orderBy: (item) => [asc(item.createdAt)],
      with: {
        variant: {
          with: {
            product: {
              with: {
                images: {
                  orderBy: (img, { asc: a }) => [a(img.position)],
                  limit: 1,
                },
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

    const subtotalMinor = lines.reduce((s, l) => s + l.lineTotalMinor, 0);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    return { lines, subtotalMinor, count };
  },
  ["cart"],
  { tags: [CART_TAG] },
);

export async function getCart(): Promise<CartView> {
  const cartId = await getCartIdFromCookie();
  if (cartId === null) return EMPTY;
  return loadCart(cartId);
}
