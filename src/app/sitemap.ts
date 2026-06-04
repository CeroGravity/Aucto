import type { MetadataRoute } from "next";

import { env } from "@/lib/env";
import { getCategories } from "@/server/queries/categories";
import { getProducts } from "@/server/queries/products";

// DB-backed: render per request so the sitemap reflects live published products
// (not a build-time snapshot).
export const dynamic = "force-dynamic";

// Dynamic sitemap: home, the catalog, each category view, and every PUBLISHED
// product. getProducts() already filters to published (drafts/archived are
// excluded), so unpublished content never leaks here. Private/transactional
// routes (admin/account/checkout/api) are intentionally absent.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/$/, "");
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/products?category=${c.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/products/${p.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
