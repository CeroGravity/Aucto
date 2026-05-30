import { eq } from "drizzle-orm";
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
  // and images (no N+1).
  return db.query.products.findMany({
    where: categoryId === undefined ? undefined : eq(products.categoryId, categoryId),
    with: {
      category: true,
      variants: { orderBy: (variant, { asc }) => [asc(variant.size)] },
      images: { orderBy: (image, { asc }) => [asc(image.position)] },
    },
    orderBy: (product, { asc, desc }) => [desc(product.featured), asc(product.name)],
  });
}

// Cached per-request so the PDP page and its generateMetadata share one query.
export const getProductBySlug = cache(async (slug: string) => {
  // Single relational query: product + category + variants + images.
  return db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      category: true,
      variants: { orderBy: (variant, { asc }) => [asc(variant.size)] },
      images: { orderBy: (image, { asc }) => [asc(image.position)] },
    },
  });
});

export type ProductListItem = Awaited<ReturnType<typeof getProducts>>[number];
export type ProductWithRelations = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
