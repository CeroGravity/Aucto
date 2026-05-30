import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "About",
  description: "Aucto means growth. Performance gear built to help you move with power.",
};

export default function AboutPage() {
  return (
    <Container className="max-w-3xl py-20 md:py-28">
      <p className="font-medium text-muted-foreground text-sm uppercase tracking-widest">
        Our name
      </p>
      <h1 className="mt-4 font-display font-bold text-4xl text-primary tracking-tight md:text-6xl">
        Move with Power
      </h1>

      <div className="mt-10 flex flex-col gap-6 text-lg text-muted-foreground leading-relaxed">
        <p>
          <span className="font-semibold text-foreground">Aucto</span> comes from the Latin root{" "}
          <span className="font-mono">auct-</span> — "to increase," "to grow." It's the idea at the
          center of everything we make: growth, advancement, the act of creating and elevating.
        </p>
        <p>
          We build performance training gear and fightwear for people who show up to get better. No
          noise, no gimmicks — just clean, honest equipment engineered to move with you and last.
        </p>
        <p>
          Every rep, every round, every session is a small act of growth. That's the promise in our
          name, and the reason we exist: to help you move with power.
        </p>
      </div>

      <h2 className="mt-16 font-display font-bold text-2xl text-primary tracking-tight">
        Built to grow with you
      </h2>
      <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
        Variant-level fit, durable materials, and a tight, considered range. We'd rather make fewer
        things well than fill a catalog. As you progress, the gear keeps up.
      </p>
    </Container>
  );
}
