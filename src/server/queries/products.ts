import { and, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

export async function getProducts({ category }: { category?: string } = {}) {
  let categoryId: number | undefined;

  if (category) {
    const match = await db.query.categories.findFirst({
      where: eq(categories.slug, category),
    });
    if (!match) return [];
    categoryId = match.id;
  }

  // Single relational query: each product loads with its category, variants,
  // and images (no N+1). Storefront shows ONLY published products.
  return db.query.products.findMany({
    where:
      categoryId === undefined
        ? eq(products.status, "published")
        : and(eq(products.status, "published"), eq(products.categoryId, categoryId)),
    with: {
      category: true,
      variants: { orderBy: (variant, { asc }) => [asc(variant.size)] },
      images: { orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.position)] },
    },
    orderBy: (product, { asc, desc }) => [desc(product.featured), asc(product.name)],
  });
}

// Cached per-request so the PDP page and its generateMetadata share one query.
// Storefront PDP only resolves published products (drafts/archived → not found).
export const getProductBySlug = cache(async (slug: string) => {
  // Single relational query: product + category + variants + images.
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
    with: {
      category: true,
      variants: { orderBy: (variant, { asc }) => [asc(variant.size)] },
      images: { orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.position)] },
    },
  });
});

export type ProductListItem = Awaited<ReturnType<typeof getProducts>>[number];
export type ProductWithRelations = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

type DisplayImage = {
  id: number;
  placeholderKey: string;
  storageKey: string | null;
  alt: string;
};

// Storefront display images: prefer UPLOADED images (already ordered
// primary-first) and drop placeholder-only rows; if a product has no uploads,
// fall back to its (single) placeholder row so something always renders.
export function displayImages(images: DisplayImage[]): DisplayImage[] {
  const uploaded = images.filter((i) => i.storageKey);
  return uploaded.length > 0 ? uploaded : images;
}
