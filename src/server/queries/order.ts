import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

// One relational query: order + its items (snapshot name/size/price). Looked up
// by the opaque access token, not the sequential id (IDOR-safe).
export async function getOrderByToken(accessToken: string) {
  return db.query.orders.findFirst({
    where: eq(orders.accessToken, accessToken),
    with: { items: true },
  });
}

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof getOrderByToken>>>;

// The signed-in user's own order history (scoped by userId — no IDOR). One
// query; items pulled relationally for the line summary + the detail link uses
// each order's own access token.
export async function getOrdersForUser(userId: string) {
  return db.query.orders.findMany({
    where: eq(orders.userId, userId),
    orderBy: desc(orders.createdAt),
    columns: {
      id: true,
      accessToken: true,
      createdAt: true,
      totalMinor: true,
      orderStatus: true,
      paymentStatus: true,
      paymentMethod: true,
    },
    with: { items: { columns: { id: true, productName: true, quantity: true } } },
  });
}

export type UserOrderRow = Awaited<ReturnType<typeof getOrdersForUser>>[number];
