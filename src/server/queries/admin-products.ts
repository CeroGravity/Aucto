import { and, asc, eq, ilike, type SQL, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { ProductStatus } from "@/lib/db/schema";
import { products } from "@/lib/db/schema";

export type AdminProductRow = {
  id: number;
  name: string;
  categoryName: string;
  priceMinor: number;
  totalStock: number;
  status: ProductStatus;
};

export async function listAdminProducts(filters: {
  status?: ProductStatus;
  categoryId?: number;
  search?: string;
}): Promise<AdminProductRow[]> {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(products.status, filters.status));
  if (filters.categoryId) {
    conditions.push(eq(products.categoryId, filters.categoryId));
  }
  if (filters.search) {
    conditions.push(ilike(products.name, `%${filters.search.trim()}%`));
  }

  // One query: products + category name + summed variant stock (subquery), all
  // statuses (drafts/archived included for the admin).
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      categoryName: sql<string>`(select name from categories where categories.id = ${products.categoryId})`,
      priceMinor: products.priceMinor,
      totalStock: sql<number>`coalesce((select sum(stock)::int from product_variants where product_variants.product_id = ${products.id}), 0)`,
      status: products.status,
    })
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(products.name));

  return rows;
}

// Product + its variants for the edit page.
export async function getAdminProduct(id: number) {
  return db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      variants: { orderBy: (v) => [asc(v.size)] },
      images: {
        orderBy: (img, { asc: a, desc }) => [desc(img.isPrimary), a(img.position)],
      },
    },
  });
}

export type AdminProductDetail = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;
