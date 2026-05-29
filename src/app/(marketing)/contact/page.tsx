import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Container className="py-24">
      <h1 className="font-display font-bold text-4xl tracking-tight md:text-5xl">Contact</h1>
      <p className="mt-6 text-lg text-muted-foreground">Aucto Contact — coming soon.</p>
    </Container>
  );
}
