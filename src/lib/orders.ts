import { and, eq, gte, ne, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { db } from "@/lib/db";
import { cartItems, orderItems, orders, productVariants } from "@/lib/db/schema";
import { paymentProvider } from "@/lib/payments";
import { CART_TAG } from "@/server/queries/cart";

class StockError extends Error {}

export type FinalizeResult =
  | { ok: true; accessToken: string; alreadyPaid: boolean }
  | { ok: false; reason: "not_found" | "declined" | "stock" };

// Server-side confirm + finalize, shared by the success redirect AND the IPN.
// Atomic and idempotent: stock is decremented exactly once even if both the
// browser return and the server IPN fire for the same order.
export async function confirmAndFinalize(args: {
  tranId: string;
  valId?: string;
}): Promise<FinalizeResult> {
  const order = await db.query.orders.findFirst({
    where: eq(orders.tranId, args.tranId),
    with: { items: { columns: { variantId: true, quantity: true } } },
  });
  if (!order) return { ok: false, reason: "not_found" };

  // Already finalized → no-op (idempotent fast path).
  if (order.status === "paid") {
    return { ok: true, accessToken: order.accessToken, alreadyPaid: true };
  }

  // Validate the payment with the provider (Validator API for SSLCommerz).
  const confirmation = await paymentProvider.confirmPayment({
    tranId: args.tranId,
    valId: args.valId,
    expectedAmountMinor: order.totalMinor,
  });
  if (confirmation.status !== "paid") return { ok: false, reason: "declined" };

  try {
    const finalized = await db.transaction(async (tx) => {
      // Claim the order — the status flip is the idempotency lock. If a
      // concurrent path already paid it, 0 rows → skip decrement.
      const claimed = await tx
        .update(orders)
        .set({ status: "paid", paymentRef: confirmation.paymentRef ?? null })
        .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
        .returning({ id: orders.id });
      if (claimed.length === 0) return false;

      // Conditional decrement (oversell-proof).
      for (const item of order.items) {
        const decremented = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
          .where(
            and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)),
          )
          .returning({ id: productVariants.id });
        if (decremented.length === 0) {
          throw new StockError("Not enough stock to fulfil the order.");
        }
      }

      if (order.cartId !== null) {
        await tx.delete(cartItems).where(eq(cartItems.cartId, order.cartId));
      }
      return true;
    });

    if (finalized) revalidateTag(CART_TAG);
  } catch (error) {
    if (error instanceof StockError) return { ok: false, reason: "stock" };
    throw error;
  }

  return { ok: true, accessToken: order.accessToken, alreadyPaid: false };
}

// Restore stock for an order whose stock was decremented at placement (manual
// methods reserve stock immediately). Called by the 5d admin on cancel/reject.
// Idempotent: flips `stockDecremented` false under the same transaction so a
// double call can't double-restore.
export async function restoreStockForOrder(orderId: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(orders)
      .set({ stockDecremented: false })
      .where(and(eq(orders.id, orderId), eq(orders.stockDecremented, true)))
      .returning({ id: orders.id });
    if (claimed.length === 0) return false; // nothing to restore (idempotent)

    const items = await tx
      .select({
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId));
    }
    return true;
  });
}
