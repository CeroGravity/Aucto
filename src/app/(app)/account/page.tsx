import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <Container className="py-24">
      <h1 className="font-display font-bold text-4xl tracking-tight md:text-5xl">Account</h1>
      <p className="mt-6 text-lg text-muted-foreground">Aucto Account — coming soon.</p>
    </Container>
  );
}
