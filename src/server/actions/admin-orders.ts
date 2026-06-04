"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { assertAdminAction } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import type { OrderLifecycle } from "@/lib/db/schema";
import { orders } from "@/lib/db/schema";
import { canTransitionOrder, canTransitionPayment } from "@/lib/order-transitions";
import { restoreStockForOrder } from "@/lib/orders";
import { PRODUCTS_TAG } from "@/server/queries/products";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

const idSchema = z.coerce.number().int().positive();

function revalidate(id: number) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  // Cancel/reject restore stock; refresh the tag-cached storefront OOS display.
  revalidateTag(PRODUCTS_TAG);
}

async function loadOrder(id: number) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    columns: { id: true, orderStatus: true, paymentStatus: true },
  });
}

// --- Order lifecycle transitions (confirm / ship / deliver) ---
async function transitionOrder(
  rawId: unknown,
  to: OrderLifecycle,
  stamp?: Partial<Record<"confirmedAt" | "shippedAt" | "deliveredAt", Date>>,
): Promise<AdminActionResult> {
  await assertAdminAction();
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const id = parsed.data;

  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransitionOrder(order.orderStatus, to)) {
    return {
      ok: false,
      error: `Cannot move ${order.orderStatus} → ${to}.`,
    };
  }

  await db
    .update(orders)
    .set({ orderStatus: to, ...stamp })
    .where(eq(orders.id, id));
  revalidate(id);
  return { ok: true };
}

export async function confirmOrder(id: unknown): Promise<AdminActionResult> {
  return transitionOrder(id, "confirmed", { confirmedAt: new Date() });
}
export async function shipOrder(id: unknown): Promise<AdminActionResult> {
  return transitionOrder(id, "shipped", { shippedAt: new Date() });
}
export async function deliverOrder(id: unknown): Promise<AdminActionResult> {
  return transitionOrder(id, "delivered", { deliveredAt: new Date() });
}

// --- Cancel (→ cancelled + restore reserved stock, idempotent) ---
export async function cancelOrder(rawId: unknown): Promise<AdminActionResult> {
  await assertAdminAction();
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const id = parsed.data;

  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransitionOrder(order.orderStatus, "cancelled")) {
    return { ok: false, error: `Cannot cancel a ${order.orderStatus} order.` };
  }

  await restoreStockForOrder(id); // idempotent (stockDecremented guard)
  await db
    .update(orders)
    .set({ orderStatus: "cancelled", cancelledAt: new Date() })
    .where(eq(orders.id, id));
  revalidate(id);
  return { ok: true };
}

// --- Payment: mark paid (COD or MFS verify) ---
export async function markPaid(rawId: unknown): Promise<AdminActionResult> {
  await assertAdminAction();
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const id = parsed.data;

  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransitionPayment(order.paymentStatus, "paid")) {
    return {
      ok: false,
      error: `Cannot mark ${order.paymentStatus} as paid.`,
    };
  }

  await db.update(orders).set({ paymentStatus: "paid" }).where(eq(orders.id, id));
  revalidate(id);
  return { ok: true };
}

// --- Payment: reject MFS (→ rejected + cancel order + restore stock once) ---
export async function rejectPayment(rawId: unknown): Promise<AdminActionResult> {
  await assertAdminAction();
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid order." };
  const id = parsed.data;

  const order = await loadOrder(id);
  if (!order) return { ok: false, error: "Order not found." };
  if (!canTransitionPayment(order.paymentStatus, "rejected")) {
    return {
      ok: false,
      error: `Cannot reject a ${order.paymentStatus} payment.`,
    };
  }

  await restoreStockForOrder(id); // idempotent
  await db
    .update(orders)
    .set({
      paymentStatus: "rejected",
      orderStatus: "cancelled",
      cancelledAt: new Date(),
    })
    .where(eq(orders.id, id));
  revalidate(id);
  return { ok: true };
}
