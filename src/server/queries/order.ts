import { eq } from "drizzle-orm";

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
