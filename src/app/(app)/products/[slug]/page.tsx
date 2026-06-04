import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SizeSelector } from "@/components/features/size-selector";
import { JsonLd } from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { ProductImage } from "@/components/ui/product-image";
import { env } from "@/lib/env";
import { formatPriceMinor } from "@/lib/money";
import { displayImages, getProductBySlug } from "@/server/queries/products";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

// Absolute URL for a product's primary image (OG + JSON-LD). Uploaded images
// serve from /api/images/<key>; with no upload, fall back to the brand OG.
function primaryImageUrl(storageKey: string | null | undefined): string {
  const base = env.APP_URL.replace(/\/$/, "");
  return storageKey ? `${base}/api/images/${storageKey}` : `${base}/opengraph-image.png`;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  // A missing/unpublished slug is 404'd by middleware before this renders, so
  // the metadata path only sees real published products. Guard for type-safety.
  if (!product) notFound();
  const [cover] = displayImages(product.images);
  const ogImage = primaryImageUrl(cover?.storageKey);
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.description,
      url: `/products/${product.slug}`,
      images: [{ url: ogImage }],
    },
    twitter: { card: "summary_large_image", images: [ogImage] },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const variants = product.variants.map((variant) => ({
    id: variant.id,
    size: variant.size,
    stock: variant.stock,
  }));
  const [cover, ...rest] = displayImages(product.images);

  // Product JSON-LD: price in BDT from poisha; availability from total stock.
  const inStock = product.variants.some((v) => v.stock > 0);
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [primaryImageUrl(cover?.storageKey)],
    category: product.category.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: (product.priceMinor / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${env.APP_URL.replace(/\/$/, "")}/products/${product.slug}`,
    },
  };

  return (
    <Container className="py-10 md:py-16">
      <JsonLd data={productJsonLd} />
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
            {cover ? (
              <ProductImage
                placeholderKey={cover.placeholderKey}
                storageKey={cover.storageKey}
                alt={cover.alt}
                priority
                sizes="(min-width: 768px) 50vw, 100vw"
              />
            ) : null}
          </div>
          {rest.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {rest.map((image) => (
                <div
                  key={image.id}
                  className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                >
                  <ProductImage
                    placeholderKey={image.placeholderKey}
                    storageKey={image.storageKey}
                    alt={image.alt}
                    sizes="(min-width: 768px) 16vw, 33vw"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Link
              href={`/products?category=${product.category.slug}`}
              className="w-fit rounded-sm text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {product.category.name}
            </Link>
            <h1 className="font-display font-bold text-3xl tracking-tight md:text-4xl">
              {product.name}
            </h1>
            <p className="text-foreground text-xl">{formatPriceMinor(product.priceMinor)}</p>
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          <SizeSelector
            variants={variants}
            product={{
              slug: product.slug,
              name: product.name,
              priceMinor: product.priceMinor,
              imageKey: cover?.placeholderKey ?? null,
              imageAlt: cover?.alt ?? null,
            }}
          />
        </div>
      </div>
    </Container>
  );
}
