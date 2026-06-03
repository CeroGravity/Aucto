import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderTimeline } from "@/components/admin/order-timeline";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { AdminOrderActions } from "@/components/features/admin-order-actions";
import { Separator } from "@/components/ui/separator";
import { formatPriceMinor } from "@/lib/money";
import { getAdminOrder } from "@/server/queries/admin-orders";

export const metadata: Metadata = { title: "Order — Admin" };

const METHOD_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  fake: "Card",
  sslcommerz: "Card",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const order = await getAdminOrder(orderId);
  if (!order) notFound();

  const isMfs = order.paymentMethod === "bkash" || order.paymentMethod === "nagad";

  return (
    <div className="mt-2 max-w-3xl">
      <Link
        href="/admin/orders"
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        ← All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display font-bold text-2xl text-primary tracking-tight md:text-3xl">
          Order #{order.id}
        </h1>
        <OrderStatusBadge status={order.orderStatus} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <span className="text-muted-foreground text-sm">
          {METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
        </span>
      </div>

      <div className="mt-6 rounded-xl border border-border p-5">
        <h2 className="font-semibold">Timeline</h2>
        <div className="mt-4">
          <OrderTimeline
            createdAt={order.createdAt}
            confirmedAt={order.confirmedAt}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
            cancelledAt={order.cancelledAt}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border p-5">
        <h2 className="font-semibold">Actions</h2>
        <div className="mt-3">
          <AdminOrderActions
            orderId={order.id}
            orderStatus={order.orderStatus}
            paymentStatus={order.paymentStatus}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border p-5">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {item.productName} · {item.size} × {item.quantity}
              </span>
              <span>{formatPriceMinor(item.unitPriceMinor * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-3" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPriceMinor(order.subtotalMinor)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>{formatPriceMinor(order.shippingMinor)}</span>
        </div>
        <Separator className="my-3" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPriceMinor(order.totalMinor)}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-5">
          <h2 className="font-semibold">Shipping</h2>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            {order.fullName}
            <br />
            {order.address}, {order.area}
            <br />
            {order.city}
            {order.postcode ? ` ${order.postcode}` : ""}
            <br />
            {order.phone}
          </p>
        </div>

        {isMfs ? (
          <div className="rounded-xl border border-border p-5">
            <h2 className="font-semibold">Payment proof</h2>
            <p className="mt-2 text-sm">
              TrxID: <span className="font-medium">{order.trxId}</span>
            </p>
            {order.screenshotKey ? (
              // Screenshot is served only through the admin-gated route.
              // biome-ignore lint/performance/noImgElement: admin-only proof, not next/image-optimizable
              <img
                src={`/api/admin/screenshot/${order.screenshotKey}`}
                alt={`Payment screenshot for order ${order.id}`}
                className="mt-3 max-h-80 w-full rounded-md border border-border object-contain"
              />
            ) : (
              <p className="mt-3 text-muted-foreground text-sm">No screenshot.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
