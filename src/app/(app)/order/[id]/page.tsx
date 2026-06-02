import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { formatPriceMinor } from "@/lib/money";
import { getOrderById } from "@/server/queries/order";

export const metadata: Metadata = { title: "Order confirmed" };

type OrderPageProps = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const order = await getOrderById(orderId);
  if (!order) notFound();

  return (
    <Container className="max-w-2xl py-12 md:py-16">
      <p className="font-medium text-primary text-sm uppercase tracking-widest">
        Order #{order.id}
      </p>
      <h1 className="mt-3 font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Thank you — your order is confirmed.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Status: <span className="font-medium text-foreground capitalize">{order.status}</span>
      </p>

      <div className="mt-8 rounded-xl border border-border p-5">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {item.productName} · {item.size} × {item.quantity}
              </span>
              <span>{formatPriceMinor(item.unitPriceMinor * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <Separator className="my-4" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPriceMinor(order.subtotalMinor)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span>{formatPriceMinor(order.shippingMinor)}</span>
        </div>
        <Separator className="my-4" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPriceMinor(order.totalMinor)}</span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold">Shipping to</h2>
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

      <Button asChild className="mt-8">
        <Link href="/products">Continue shopping</Link>
      </Button>
    </Container>
  );
}
