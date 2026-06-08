import { Hero3DLazy } from "@/components/hero/hero-3d-lazy";
import { HeroStatic } from "@/components/hero/hero-static";
import { JsonLd } from "@/components/seo/json-ld";
import { env } from "@/lib/env";

export default function HomePage() {
  const base = env.APP_URL.replace(/\/$/, "");
  const sameAs = env.NEXT_PUBLIC_FACEBOOK_URL ? [env.NEXT_PUBLIC_FACEBOOK_URL] : undefined;

  const organizationJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Aucto",
    url: base,
    logo: `${base}/icon.png`,
    ...(sameAs ? { sameAs } : {}),
  };

  const websiteJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Aucto",
    url: base,
  };

  // Hero: the static layer (HeroStatic) is the LCP and renders without JS; the
  // decorative 3D scene (Hero3DLazy, aria-hidden, separate chunk) enhances over
  // it after first paint on capable devices. The relative section reserves the
  // space so the 3D mounting causes no layout shift.
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      {/* Full-bleed hero: pulled up under the sticky 64px header (-mt-16) so the
          animation reaches the very top, and -mb-24 cancels the footer's top
          margin so it flows all the way DOWN to the footer line — no gap, no
          mid-screen cutoff. The header (z-40, semi-transparent) floats over it. */}
      <section className="relative -mt-16 -mb-24 overflow-hidden">
        <Hero3DLazy />
        <HeroStatic />
      </section>
    </>
  );
}
