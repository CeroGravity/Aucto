import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

// Static hero — the LCP. Server-rendered, no JS required: the motto + CTA as
// real focusable text over a FULL-BLEED, theme-aware field (the same background
// the 3D ridges draw over, so the static layer matches before/without the 3D and
// fills the viewport edge-to-edge). NO darkening scrim — the heading reads by
// natural theme contrast over the subtle field. Uses --hero-* tokens, so it
// adapts light/dark on no-JS / reduced-motion / low-power.
export function HeroStatic() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pt-32 pb-24 text-center">
      {/* Full-bleed atmospheric field (token gradient) + a faint accent glow.
          Decorative, no CLS, no JS — and no darkening overlay. */}
      <div aria-hidden="true" className="hero-field -z-20 pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="hero-glow -z-10 pointer-events-none absolute inset-0" />
      <Container className="relative z-10 flex max-w-3xl flex-col items-center gap-6">
        <h1 className="font-display font-bold text-5xl text-primary tracking-tight md:text-7xl">
          Move with Power
        </h1>
        <p className="max-w-md text-lg text-muted-foreground leading-relaxed">
          Curated gear for Bangladesh. Clean design, honest prices, fast delivery.
        </p>
        <Button asChild size="lg">
          <Link href="/products">Shop now</Link>
        </Button>
      </Container>
    </div>
  );
}
