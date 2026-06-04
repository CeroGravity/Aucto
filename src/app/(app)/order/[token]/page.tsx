import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { env } from "@/lib/env";
import { formatPriceMinor } from "@/lib/money";
import { getOrderByToken } from "@/server/queries/order";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

type OrderPageProps = { params: Promise<{ token: string }> };

const METHOD_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  fake: "Card",
  sslcommerz: "Card",
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  // Access requires the unguessable token (the logged-in owner reaches the page
  // via that same token). Unknown token → 404, no data leaks.
  if (!order) notFound();

  const isMfs = order.paymentMethod === "bkash" || order.paymentMethod === "nagad";
  const isCod = order.paymentMethod === "cod";
  const facebookUrl = env.NEXT_PUBLIC_FACEBOOK_URL;

  return (
    <Container className="max-w-2xl py-12 md:py-16">
      <p className="font-medium text-primary text-sm uppercase tracking-widest">
        Order #{order.id}
      </p>
      <h1 className="mt-3 font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Thank you — your order is confirmed.
      </h1>

      <div className="mt-4 flex flex-col gap-1 text-sm">
        <p className="text-muted-foreground">
          Payment method:{" "}
          <span className="font-medium text-foreground">
            {METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}
          </span>
        </p>
        {isCod ? (
          <p className="font-medium text-foreground">
            Pay {formatPriceMinor(order.totalMinor)} on delivery.
          </p>
        ) : null}
        {isMfs ? (
          <p className="font-medium text-foreground">
            Payment under verification — TrxID {order.trxId}. We'll confirm shortly.
          </p>
        ) : null}
      </div>

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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button asChild>
          <Link href="/products">Continue shopping</Link>
        </Button>
        {facebookUrl ? (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm text-primary text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Message us on Facebook
          </a>
        ) : null}
      </div>
    </Container>
  );
}
