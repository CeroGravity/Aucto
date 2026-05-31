import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { db } from "@/lib/db";
import { carts } from "@/lib/db/schema";

export const CART_COOKIE = "aucto_cart";

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

  store.set(CART_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 days
  });

  return created.id;
}
