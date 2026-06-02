import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";

// One relational query: order + its items (items carry snapshot
// name/size/price, so no further joins are needed).
export async function getOrderById(id: number) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
}

export type OrderWithItems = NonNullable<Awaited<ReturnType<typeof getOrderById>>>;
