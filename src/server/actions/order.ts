"use server";

import { randomBytes } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { CART_COOKIE, getCartIdFromCookie } from "@/lib/cart";
import { SHIPPING_MINOR, shippingSchema, trxIdSchema } from "@/lib/checkout";
import { db } from "@/lib/db";
import { cartItems, orderItems, orders, productVariants } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { paymentProvider } from "@/lib/payments";
import { isManualMethod, isMfsMethod } from "@/lib/payments/manual";
import { storageProvider } from "@/lib/storage";
import { validateImageUpload } from "@/lib/uploads";
import { CART_TAG } from "@/server/queries/cart";

export type PlaceOrderResult = { ok: true; redirectUrl: string } | { ok: false; error: string };
export type PlaceManualResult = { ok: true; accessToken: string } | { ok: false; error: string };

class StockError extends Error {}

const token = () => randomBytes(24).toString("base64url");
const newTranId = () => `auc${randomBytes(11).toString("hex")}`; // ≤30 chars

// COD + bKash/Nagad placement. Stock is decremented atomically at placement
// (oversell-proof). MFS orders are recorded `awaiting_verification` with the
// TrxID + a validated screenshot (stored via the storage abstraction); 5d's
// admin verifies them (and restoreStockForOrder undoes a reject). COD is
// `unpaid` (pay on delivery). Returns the receipt access token.
export async function placeManualOrder(formData: FormData): Promise<PlaceManualResult> {
  const method = String(formData.get("method") ?? "");
  if (!isManualMethod(method)) {
    return { ok: false, error: "Choose a payment method." };
  }

  const shippingParsed = shippingSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    area: formData.get("area"),
    city: formData.get("city"),
    postcode: formData.get("postcode") || undefined,
  });
  if (!shippingParsed.success) {
    return {
      ok: false,
      error: shippingParsed.error.issues[0]?.message ?? "Please complete the form.",
    };
  }
  const shipping = shippingParsed.data;

  // MFS: validate TrxID + screenshot BEFORE creating anything.
  let trxId: string | null = null;
  let screenshotKey: string | null = null;
  if (isMfsMethod(method)) {
    const trx = trxIdSchema.safeParse(formData.get("trxId"));
    if (!trx.success) {
      return { ok: false, error: trx.error.issues[0]?.message ?? "Invalid TrxID." };
    }
    const upload = await validateImageUpload(formData.get("screenshot"));
    if (!upload.ok) return { ok: false, error: upload.error };
    trxId = trx.data;
    screenshotKey = await storageProvider.put(upload.image, "private");
  }

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
  const accessToken = token();
  const paymentStatus = isMfsMethod(method) ? "awaiting_verification" : "unpaid";

  try {
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          tranId: newTranId(),
          accessToken,
          userId,
          cartId,
          status: "pending",
          orderStatus: "pending",
          paymentStatus,
          paymentMethod: method,
          subtotalMinor,
          shippingMinor: SHIPPING_MINOR,
          totalMinor,
          fullName: shipping.fullName,
          phone: shipping.phone,
          address: shipping.address,
          area: shipping.area,
          city: shipping.city,
          postcode: shipping.postcode ? shipping.postcode : null,
          trxId,
          screenshotKey,
          stockDecremented: true,
        })
        .returning({ id: orders.id });
      if (!order) throw new StockError("Could not create order.");

      await tx.insert(orderItems).values(
        items.map((i) => ({
          orderId: order.id,
          variantId: i.variantId,
          productName: i.variant.product.name,
          size: i.variant.size,
          unitPriceMinor: i.variant.product.priceMinor,
          quantity: i.quantity,
        })),
      );

      // Atomic, oversell-proof decrement at placement.
      for (const item of items) {
        const decremented = await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
          .where(
            and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)),
          )
          .returning({ id: productVariants.id });
        if (decremented.length === 0) {
          throw new StockError(`Not enough stock for ${item.variant.product.name}.`);
        }
      }

      await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      return order.id;
    });

    void result;
    // The guest cart is consumed by the order. Clear the cookie so the receipt
    // load resolves an empty cart immediately (getCartIdFromCookie → null →
    // EMPTY, bypassing the cached loadCart) — no stale header count, no race
    // with tag revalidation. Also bust the tag for any other cached reads.
    const store = await cookies();
    store.delete(CART_COOKIE);
    revalidateTag(CART_TAG);
    return { ok: true, accessToken };
  } catch (error) {
    if (error instanceof StockError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

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
