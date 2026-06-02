import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { cartItems, carts } from "@/lib/db/schema";

export const CART_COOKIE = "aucto_cart";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 60, // 60 days
} as const;

// Opaque, unguessable session token for the guest cart cookie.
function newToken(): string {
  return randomBytes(24).toString("base64url");
}

// Read-only resolution. An absent cookie means an empty cart — we never create
// a cart (or set a cookie) on read, only on the first mutation (see
// getOrCreateCart). Phase 4 merges this guest cart (by cookie/sessionToken)
// into the user's cart (carts.userId) on login.
export async function getCartIdFromCookie(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;
  if (!token) return null;

  const cart = await db.query.carts.findFirst({
    where: eq(carts.sessionToken, token),
    columns: { id: true },
  });
  return cart?.id ?? null;
}

// Mutation-time resolution: reuse the cookie's cart, or create one and set the
// cookie. Only ever called from server actions (which may write cookies).
export async function getOrCreateCart(): Promise<number> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;

  if (token) {
    const existing = await db.query.carts.findFirst({
      where: eq(carts.sessionToken, token),
      columns: { id: true },
    });
    if (existing) return existing.id;
  }

  const sessionToken = newToken();
  const [created] = await db.insert(carts).values({ sessionToken }).returning({ id: carts.id });
  if (!created) throw new Error("Failed to create cart.");

  store.set(CART_COOKIE, sessionToken, COOKIE_OPTS);

  return created.id;
}

// On login/register: fold the guest cart (by cookie) into the user's cart (by
// userId). No user cart → claim the guest cart; both exist → merge item
// quantities (clamped to stock) and drop the guest cart. Afterwards the cookie
// points at the single surviving cart.
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(CART_COOKIE)?.value;

  const guestCart = token
    ? await db.query.carts.findFirst({
        where: eq(carts.sessionToken, token),
        columns: { id: true, sessionToken: true },
      })
    : null;

  const userCart = await db.query.carts.findFirst({
    where: eq(carts.userId, userId),
    columns: { id: true, sessionToken: true },
  });

  // No guest cart: ensure the cookie points at the user's cart (if any).
  if (!guestCart) {
    if (userCart) store.set(CART_COOKIE, userCart.sessionToken, COOKIE_OPTS);
    return;
  }

  // User has no cart yet: claim the guest cart.
  if (!userCart) {
    await db.update(carts).set({ userId, updatedAt: new Date() }).where(eq(carts.id, guestCart.id));
    return;
  }

  if (userCart.id === guestCart.id) return;

  // Merge guest items into the user cart (sum, clamp to variant stock).
  const guestItems = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, guestCart.id),
    with: { variant: { columns: { id: true, stock: true } } },
  });

  for (const item of guestItems) {
    const stock = item.variant.stock;
    if (stock <= 0) continue;

    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.cartId, userCart.id), eq(cartItems.variantId, item.variantId)),
      columns: { id: true, quantity: true },
    });

    if (existing) {
      const merged = Math.min(existing.quantity + item.quantity, stock);
      await db.update(cartItems).set({ quantity: merged }).where(eq(cartItems.id, existing.id));
    } else {
      const qty = Math.min(item.quantity, stock);
      await db
        .insert(cartItems)
        .values({ cartId: userCart.id, variantId: item.variantId, quantity: qty });
    }
  }

  // Drop the guest cart (cascade removes its items) and point the cookie at the
  // user cart.
  await db.delete(carts).where(eq(carts.id, guestCart.id));
  store.set(CART_COOKIE, userCart.sessionToken, COOKIE_OPTS);
}
