import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";
import { clearCapturedNotifications, getCapturedNotifications } from "@/lib/notifications";
import { dispatchOrderNotifications } from "@/lib/orders";

// Integration test against the real DB + the FAKE notifier (default). Verifies
// dispatch builds the right payload and captures alert + receipt.
async function makeOrder(email: string | null): Promise<number> {
  const variant = await db.query.productVariants.findFirst({
    columns: { id: true, size: true },
  });
  if (!variant) throw new Error("Seed the DB first (pnpm db:seed).");

  const [order] = await db
    .insert(orders)
    .values({
      tranId: `ntfy_${randomBytes(8).toString("hex")}`,
      accessToken: randomBytes(12).toString("hex"),
      status: "pending",
      orderStatus: "pending",
      paymentStatus: "unpaid",
      paymentMethod: "cod",
      subtotalMinor: 190000,
      shippingMinor: 6000,
      totalMinor: 196000,
      fullName: "Notify Buyer",
      phone: "01700000000",
      address: "1 Rd",
      area: "Gulshan",
      city: "Dhaka",
      customerEmail: email,
      stockDecremented: false,
    })
    .returning({ id: orders.id });
  if (!order) throw new Error("insert failed");
  await db.insert(orderItems).values({
    orderId: order.id,
    variantId: variant.id,
    productName: "Compression Top",
    size: variant.size,
    unitPriceMinor: 95000,
    quantity: 2,
  });
  return order.id;
}

const created: number[] = [];
afterEach(async () => {
  clearCapturedNotifications();
  for (const id of created.splice(0)) {
    await db.delete(orders).where(eq(orders.id, id));
  }
});

describe("dispatchOrderNotifications (fake notifier)", () => {
  it("captures an owner alert; receipt only when an email is present", async () => {
    clearCapturedNotifications();
    const withEmail = await makeOrder("buyer@example.com");
    created.push(withEmail);
    await dispatchOrderNotifications(withEmail);

    const cap = getCapturedNotifications();
    const alert = cap.find((c) => c.kind === "alert" && c.orderId === withEmail);
    const receipt = cap.find((c) => c.kind === "receipt" && c.orderId === withEmail);
    expect(alert).toBeTruthy();
    expect(alert?.kind === "alert" && alert.message).toContain("#" + withEmail);
    expect(receipt).toBeTruthy();
    expect(receipt?.kind === "receipt" && receipt.to).toBe("buyer@example.com");
  });

  it("no receipt when the order has no email (alert still fires)", async () => {
    clearCapturedNotifications();
    const noEmail = await makeOrder(null);
    created.push(noEmail);
    await dispatchOrderNotifications(noEmail);

    const cap = getCapturedNotifications();
    expect(cap.some((c) => c.kind === "alert" && c.orderId === noEmail)).toBe(true);
    expect(cap.some((c) => c.kind === "receipt" && c.orderId === noEmail)).toBe(false);
  });

  it("never throws even for a missing order", async () => {
    await expect(dispatchOrderNotifications(999999999)).resolves.toBeUndefined();
  });

  it("a throwing notifier is swallowed (non-blocking)", async () => {
    const id = await makeOrder("buyer@example.com");
    created.push(id);
    const boom = {
      notifyNewOrder: () => Promise.reject(new Error("boom")),
      sendOrderReceipt: () => Promise.reject(new Error("boom")),
    };
    // Must resolve, not reject — proves a failing notifier can't break the
    // caller (the order action / finalize path).
    await expect(dispatchOrderNotifications(id, boom)).resolves.toBeUndefined();
  });
});
