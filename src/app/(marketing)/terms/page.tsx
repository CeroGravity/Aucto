import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <Container className="py-24">
      <h1 className="font-display font-bold text-4xl tracking-tight md:text-5xl">Terms</h1>
      <p className="mt-6 text-lg text-muted-foreground">Aucto Terms — coming soon.</p>
    </Container>
  );
}
