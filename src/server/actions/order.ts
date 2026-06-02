"use server";

import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { getCartIdFromCookie } from "@/lib/cart";
import { SHIPPING_MINOR, shippingSchema } from "@/lib/checkout";
import { db } from "@/lib/db";
import { cartItems, orderItems, orders } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { paymentProvider } from "@/lib/payments";

export type PlaceOrderResult = { ok: true; redirectUrl: string } | { ok: false; error: string };

const token = () => randomBytes(24).toString("base64url");
const newTranId = () => `auc${randomBytes(11).toString("hex")}`; // ≤30 chars

// Initiate: create a pending order (no stock decrement yet) and hand back the
// gateway redirect URL. Stock is decremented only after the payment is
// validated on return/IPN (see lib/orders.ts confirmAndFinalize).
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

  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId),
    with: {
      variant: {
        with: { product: { columns: { name: true, priceMinor: true } } },
      },
    },
  });
  if (items.length === 0) return { ok: false, error: "Your cart is empty." };

  const subtotalMinor = items.reduce(
    (sum, i) => sum + i.variant.product.priceMinor * i.quantity,
    0,
  );
  const totalMinor = subtotalMinor + SHIPPING_MINOR;
  const numItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const first = items[0];
  const productName =
    items.length === 1 && first ? first.variant.product.name : `Aucto order (${numItems} items)`;

  const tranId = newTranId();
  const accessToken = token();

  const [order] = await db
    .insert(orders)
    .values({
      tranId,
      accessToken,
      userId,
      cartId,
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
  if (!order) return { ok: false, error: "Could not create order." };

  await db.insert(orderItems).values(
    items.map((i) => ({
      orderId: order.id,
      variantId: i.variantId,
      productName: i.variant.product.name,
      size: i.variant.size,
      unitPriceMinor: i.variant.product.priceMinor,
      quantity: i.quantity,
    })),
  );

  const base = env.APP_URL;
  try {
    const { redirectUrl } = await paymentProvider.initiatePayment({
      tranId,
      amountMinor: totalMinor,
      productName,
      numItems,
      customer: {
        name: shipping.fullName,
        email: session?.user?.email ?? null,
        phone: shipping.phone,
        address: shipping.address,
        city: shipping.city,
        postcode: shipping.postcode ? shipping.postcode : null,
      },
      successUrl: `${base}/api/payment/success`,
      failUrl: `${base}/api/payment/fail`,
      cancelUrl: `${base}/api/payment/cancel`,
      ipnUrl: `${base}/api/payment/ipn`,
    });
    return { ok: true, redirectUrl };
  } catch {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, order.id));
    return { ok: false, error: "Could not start payment. Please try again." };
  }
}
