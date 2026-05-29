import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Container className="py-24">
      <h1 className="font-display font-bold text-4xl tracking-tight md:text-5xl">Privacy</h1>
      <p className="mt-6 text-lg text-muted-foreground">Aucto Privacy — coming soon.</p>
    </Container>
  );
}
