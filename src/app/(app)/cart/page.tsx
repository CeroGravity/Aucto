import type { Metadata } from "next";

import { CartPanel } from "@/components/features/cart-panel";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display font-bold text-4xl text-primary tracking-tight md:text-5xl">
        Cart
      </h1>
      <div className="mx-auto mt-8 flex min-h-[45vh] max-w-2xl flex-col rounded-xl border border-border">
        <CartPanel />
      </div>
    </Container>
  );
}
