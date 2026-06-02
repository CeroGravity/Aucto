import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/components/features/checkout-form";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { SHIPPING_MINOR } from "@/lib/checkout";
import { formatPriceMinor } from "@/lib/money";
import { getCart } from "@/server/queries/cart";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const cart = await getCart();
  if (cart.lines.length === 0) redirect("/cart");

  const session = await auth();
  const totalMinor = cart.subtotalMinor + SHIPPING_MINOR;

  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Checkout
      </h1>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="order-2 lg:order-1">
          <h2 className="font-semibold text-lg">Shipping details</h2>
          <div className="mt-5">
            <CheckoutForm defaultValues={{ fullName: session?.user?.name ?? "" }} />
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
