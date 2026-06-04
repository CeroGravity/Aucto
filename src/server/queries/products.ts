import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";

// Cache tag for the cached existence probe (below). Busted by
// revalidateTag(PRODUCTS_TAG) on any product/variant mutation + order placement
// so the middleware's 404 decision never goes stale.
export const PRODUCTS_TAG = "products";

// Storefront product list — request-scoped React cache only. Like the PDP read,
// this returns live variant IDs/stock; keeping it uncached avoids serving a
// stale catalog after out-of-band DB changes. The list is one query and the
// route is dynamic, so the cost is negligible (CWV stays green).
export const getProducts = cache(async ({ category }: { category?: string } = {}) => {
  let categoryId: number | undefined;
  if (category) {
    const match = await db.query.categories.findFirst({ where: eq(categories.slug, category) });
    if (!match) return [];
    categoryId = match.id;
  }
  return db.query.products.findMany({
    where:
      categoryId === undefined
        ? eq(products.status, "published")
        : and(eq(products.status, "published"), eq(products.categoryId, categoryId)),
    with: {
      category: true,
      variants: { orderBy: (variant, { asc }) => [asc(variant.size)] },
      images: {
        orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.position)],
      },
    },
    orderBy: (product, { asc, desc }) => [desc(product.featured), asc(product.name)],
  });
});

// PDP read — request-scoped React cache only (NOT unstable_cache). The PDP feeds
// the SizeSelector the live variant IDs/stock that add-to-cart writes against,
// so it must reflect the DB at request time; a persisted data-cache could serve
// a variant the DB no longer has (→ "Item not found" on add). The page read is
// a single query and the page is already dynamic, so this costs nothing vs. the
// probe (which IS cached, eliminating the per-PDP double hit). `cache` still
// dedupes the page + its generateMetadata to one query per request.
export const getProductBySlug = cache(async (slug: string) => {
  return db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
    with: {
      category: true,
      variants: { orderBy: (variant, { asc }) => [asc(variant.size)] },
      images: {
        orderBy: (image, { asc, desc }) => [desc(image.isPrimary), asc(image.position)],
      },
    },
  });
});

// Existence probe for the Edge middleware's real-404 decision. Tag-cached so the
// per-PDP middleware probe is a cache HIT (no DB query) — mirrors the published
// filter of getProductBySlug. Busted on mutation alongside the reads above.
export const isPublishedSlug = unstable_cache(
  async (slug: string): Promise<boolean> => {
    const found = await db.query.products.findFirst({
      columns: { id: true },
      where: and(eq(products.slug, slug), eq(products.status, "published")),
    });
    return Boolean(found);
  },
  ["storefront-published-slug"],
  { tags: [PRODUCTS_TAG] },
);

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
