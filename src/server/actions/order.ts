"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";

import { auth } from "@/lib/auth";
import { getCartIdFromCookie } from "@/lib/cart";
import { SHIPPING_MINOR, shippingSchema } from "@/lib/checkout";
import { db } from "@/lib/db";
import { cartItems, orderItems, orders, productVariants } from "@/lib/db/schema";
import { paymentProvider } from "@/lib/payments";
import { CART_TAG } from "@/server/queries/cart";

export type PlaceOrderResult = { ok: true; orderId: number } | { ok: false; error: string };

// Distinguishes expected business failures (declined payment, stock) from
// unexpected errors so we can roll the transaction back cleanly.
class OrderError extends Error {}

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please complete the form.",
    };
  }
  const shipping = parsed.data;

  const cartId = await getCartIdFromCookie();
  if (cartId === null) return { ok: false, error: "Your cart is empty." };

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Authoritative cart from the DB (never the optimistic client state), with
  // variant + product for the price/name snapshot — one query.
  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId),
    with: {
      variant: {
        with: { product: { columns: { name: true, priceMinor: true } } },
      },
    },
  });
  if (items.length === 0) return { ok: false, error: "Your cart is empty." };

  // Fake-adapter test affordance (removed when 5b adds the real provider): a
  // "Test decline" full name forces a declined payment.
  const testOutcome =
    shipping.fullName.toLowerCase() === "test decline" ? ("failed" as const) : undefined;

  try {
    const orderId = await db.transaction(async (tx) => {
      let subtotalMinor = 0;
      const snapshots: Array<{
        variantId: number;
        productName: string;
        size: (typeof items)[number]["variant"]["size"];
        unitPriceMinor: number;
        quantity: number;
      }> = [];

      // Re-check + decrement stock atomically (WHERE stock >= qty guards against
      // oversell even under concurrency).
      for (const item of items) {
        const decremented = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
          .where(
            and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)),
          )
          .returning({ id: productVariants.id });

        if (decremented.length === 0) {
          throw new OrderError(`Not enough stock for ${item.variant.product.name}.`);
        }

        const unitPriceMinor = item.variant.product.priceMinor;
        subtotalMinor += unitPriceMinor * item.quantity;
        snapshots.push({
          variantId: item.variantId,
          productName: item.variant.product.name,
          size: item.variant.size,
          unitPriceMinor,
          quantity: item.quantity,
        });
      }

      const totalMinor = subtotalMinor + SHIPPING_MINOR;

      const [order] = await tx
        .insert(orders)
        .values({
          userId,
          status: "pending",
          subtotalMinor,
          shippingMinor: SHIPPING_MINOR,
          totalMinor,
          fullName: shipping.fullName,
          phone: shipping.phone,
          address: shipping.address,
          area: shipping.area,
          city: shipping.city,
          postcode: shipping.postcode ? shipping.postcode : null,
        })
        .returning({ id: orders.id });
      if (!order) throw new OrderError("Could not create order.");

      await tx.insert(orderItems).values(snapshots.map((s) => ({ orderId: order.id, ...s })));

      // Charge via the payment abstraction (fake adapter this phase).
      const payment = await paymentProvider.createPayment({
        orderId: order.id,
        amountMinor: totalMinor,
        testOutcome,
      });

      // Declined → throw → the whole transaction rolls back (stock restored, no
      // order persisted, cart untouched).
      if (payment.status !== "paid") {
        throw new OrderError("Payment was declined. Please try again.");
      }

      await tx
        .update(orders)
        .set({ status: "paid", paymentRef: payment.ref })
        .where(eq(orders.id, order.id));

      // Success → clear the cart inside the same transaction.
      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));

      return order.id;
    });

    revalidateTag(CART_TAG);
    return { ok: true, orderId };
  } catch (error) {
    if (error instanceof OrderError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
