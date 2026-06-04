import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutForm } from "@/components/features/checkout-form";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { SHIPPING_MINOR } from "@/lib/checkout";
import { env } from "@/lib/env";
import { formatPriceMinor } from "@/lib/money";
import { getCart } from "@/server/queries/cart";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

const STATUS_MESSAGES: Record<string, string> = {
  declined: "Payment was declined. Your cart is intact — try again.",
  failed: "Payment failed. Your cart is intact — try again.",
  cancelled: "Payment was cancelled. Your cart is intact.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const cart = await getCart();
  // Empty checkout renders an inline empty state (NOT redirect("/cart")) — a
  // server-side redirect here fires during the post-order cart revalidation and
  // bounces the customer through /cart between Place Order and the receipt (the
  // empty-cart flash). An inline state has no such transient navigation.
  if (cart.lines.length === 0) {
    return (
      <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="font-display font-bold text-3xl text-primary tracking-tight">
          Your cart is empty
        </h1>
        <Button asChild>
          <Link href="/products">Shop products</Link>
        </Button>
      </Container>
    );
  }

  const session = await auth();
  const totalMinor = cart.subtotalMinor + SHIPPING_MINOR;
  const statusMessage = STATUS_MESSAGES[(await searchParams).status ?? ""];

  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Checkout
      </h1>

      {statusMessage ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive-text text-sm"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="order-2 lg:order-1">
          <h2 className="font-semibold text-lg">Shipping details</h2>
          <div className="mt-5">
            <CheckoutForm
              defaultValues={{ fullName: session?.user?.name ?? "" }}
              amountLabel={formatPriceMinor(totalMinor)}
              bkashNumber={env.NEXT_PUBLIC_BKASH_NUMBER}
              nagadNumber={env.NEXT_PUBLIC_NAGAD_NUMBER}
            />
          </div>
        </div>

        <aside className="order-1 lg:order-2">
          <div className="rounded-xl border border-border p-5">
            <h2 className="font-semibold text-lg">Order summary</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {cart.lines.map((line) => (
                <li key={line.variantId} className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {line.productName} · {line.size} × {line.quantity}
                  </span>
                  <span>{formatPriceMinor(line.lineTotalMinor)}</span>
                </li>
              ))}
            </ul>
            <Separator className="my-4" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPriceMinor(cart.subtotalMinor)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatPriceMinor(SHIPPING_MINOR)}</span>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPriceMinor(totalMinor)}</span>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
