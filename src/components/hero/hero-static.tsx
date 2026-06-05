import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// Static hero — the LCP. Server-rendered, no JS required: the motto + CTA as
// real focusable text over a theme-aware accent glow (the brand "energy" hint
// that the 3D streams enhance). The glow uses the --hero-accent token, so it
// adapts to light/dark; on no-JS / reduced-motion / low-power this static layer
// (with its glow) is all that shows, and it composes well in both themes.
export function HeroStatic() {
  return (
    <Container className="relative flex min-h-[70vh] flex-col items-center justify-center gap-10 overflow-hidden py-24 text-center">
      {/* Decorative theme-aware accent glow behind the content (no CLS, no JS). */}
      <div aria-hidden="true" className="hero-glow -z-10 pointer-events-none absolute inset-0" />
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
