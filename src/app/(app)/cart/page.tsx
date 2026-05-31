import type { Metadata } from "next";

import { CartContents } from "@/components/features/cart-contents";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <Container className="py-12 md:py-16">
      <h1 className="font-display font-bold text-4xl tracking-tight md:text-5xl">Cart</h1>
      <div className="mx-auto mt-8 flex min-h-[45vh] max-w-2xl flex-col rounded-xl border border-border">
        <CartContents />
      </div>
    </Container>
  );
}
