import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SizeSelector } from "@/components/features/size-selector";
import { Container } from "@/components/ui/container";
import { ProductImage } from "@/components/ui/product-image";
import { formatPriceMinor } from "@/lib/money";
import { getProductBySlug } from "@/server/queries/products";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.description };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const variants = product.variants.map((variant) => ({
    size: variant.size,
    stock: variant.stock,
  }));
  const [cover, ...rest] = product.images;

  return (
    <Container className="py-10 md:py-16">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
            {cover ? (
              <ProductImage
                placeholderKey={cover.placeholderKey}
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

          <SizeSelector variants={variants} productSlug={product.slug} />
        </div>
      </div>
    </Container>
  );
}
