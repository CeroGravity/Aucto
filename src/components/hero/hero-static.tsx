import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// Static hero — the LCP. Server-rendered, no JS required: a navy gradient
// backdrop (the brand field) with the motto + CTA as real, focusable text. The
// 3D scene (Hero3D) enhances OVER this same backdrop; it never gates content,
// and on no-JS / reduced-motion / low-power this static layer is all that shows.
export function HeroStatic() {
  return (
    <Container className="relative flex min-h-[70vh] flex-col items-center justify-center gap-10 py-24 text-center">
      <div className="relative z-10 flex max-w-3xl flex-col items-center gap-6">
        <h1 className="font-display font-bold text-5xl text-primary tracking-tight md:text-7xl">
          Move with Power
        </h1>
        <p className="max-w-md text-lg text-muted-foreground leading-relaxed">
          Curated gear for Bangladesh. Clean design, honest prices, fast delivery.
        </p>
        <Button asChild size="lg">
          <Link href="/products">Shop now</Link>
        </Button>
      </div>
    </Container>
  );
}
