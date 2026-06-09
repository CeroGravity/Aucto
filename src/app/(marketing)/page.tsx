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

  // The home page is the full-bleed hero only — its "Shop now" CTA takes the user
  // to the all-products catalog. The hero is pulled up under the sticky 64px
  // header (-mt-16) so the animation reaches the very top, and -mb-24 cancels the
  // footer's top margin so it flows down to the footer line (no gap/cutoff). The
  // header (z-40, semi-transparent) floats over it.
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <section className="relative -mt-16 -mb-24 overflow-hidden">
        <Hero3DLazy />
        <HeroStatic />
      </section>
    </>
  );
}
