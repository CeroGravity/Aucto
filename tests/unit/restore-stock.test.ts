import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { orderItems, orders, productVariants } from "@/lib/db/schema";
import { restoreStockForOrder } from "@/lib/orders";

// Integration test against the configured DB. Creates a throwaway order whose
// stock was "decremented at placement", then asserts restoreStockForOrder adds
// the quantity back exactly once (idempotent).
let orderId: number;
let variantId: number;
let stockBefore: number;
const QTY = 2;

beforeAll(async () => {
  const variant = await db.query.productVariants.findFirst({
    columns: { id: true, stock: true, size: true },
  });
  if (!variant) throw new Error("Seed the DB first (pnpm db:seed).");
  variantId = variant.id;
  // Simulate placement decrement.
  await db
    .update(productVariants)
    .set({ stock: variant.stock - QTY })
    .where(eq(productVariants.id, variantId));
  stockBefore = variant.stock - QTY;

  const [order] = await db
    .insert(orders)
    .values({
      tranId: `test_${randomBytes(8).toString("hex")}`,
      accessToken: randomBytes(12).toString("hex"),
      status: "pending",
      orderStatus: "pending",
      paymentStatus: "awaiting_verification",
      paymentMethod: "bkash",
      subtotalMinor: 1000,
      shippingMinor: 6000,
      totalMinor: 7000,
      fullName: "Test",
      phone: "01700000000",
      address: "1 Rd",
      area: "Gulshan",
      city: "Dhaka",
      stockDecremented: true,
    })
    .returning({ id: orders.id });
  if (!order) throw new Error("insert failed");
  orderId = order.id;
  await db.insert(orderItems).values({
    orderId,
    variantId,
    productName: "Test",
    size: variant.size,
    unitPriceMinor: 1000,
    quantity: QTY,
  });
});

afterAll(async () => {
  await db.delete(orders).where(eq(orders.id, orderId)); // cascades order_items
});

describe("restoreStockForOrder", () => {
  it("restores stock once and is idempotent", async () => {
    const first = await restoreStockForOrder(orderId);
    expect(first).toBe(true);

    const v1 = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, variantId),
      columns: { stock: true },
    });
    expect(v1?.stock).toBe(stockBefore + QTY);

    // Second call must be a no-op (no double-restore).
    const second = await restoreStockForOrder(orderId);
    expect(second).toBe(false);
    const v2 = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, variantId),
      columns: { stock: true },
    });
    expect(v2?.stock).toBe(stockBefore + QTY);
  });

  it("left the order flag cleared", async () => {
    const o = await db.query.orders.findFirst({
      where: and(eq(orders.id, orderId)),
      columns: { stockDecremented: true },
    });
    expect(o?.stockDecremented).toBe(false);
  });
});
