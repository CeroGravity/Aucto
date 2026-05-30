import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function HomePage() {
  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-10 py-24 text-center">
      <div className="flex max-w-3xl flex-col items-center gap-6">
        <h1 className="font-display font-bold text-5xl text-primary tracking-tight md:text-7xl">
          Move with Power
        </h1>
        <p className="max-w-md text-lg text-muted-foreground leading-relaxed">
          Curated gear for Bangladesh. Clean design, honest prices, fast delivery.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/products">Shop now</Link>
      </Button>
    </Container>
  );
}
