// Canonical seed data + a reusable seedDatabase() used by both the CLI
// (scripts/seed.ts) and the e2e per-test reseed fixture (tests/e2e/fixtures.ts).
// Re-running seedDatabase yields identical row counts (clear-and-reseed in one
// transaction) — no duplicates, no cross-run state bleed.

import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

type Size = schema.Size;
type VariantSeed = { size: Size; stock: number };
type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  categorySlug: string;
  featured: boolean;
  variants: VariantSeed[];
  imageCount: number;
};

export const categorySeed = [
  { slug: "compression-shirts", name: "Compression Shirts" },
  { slug: "mma-shorts", name: "MMA Shorts" },
  { slug: "accessories", name: "Accessories" },
];

const v = (entries: Array<[Size, number]>): VariantSeed[] =>
  entries.map(([size, stock]) => ({ size, stock }));

export const productSeed: ProductSeed[] = [
  // --- Compression Shirts ---
  {
    slug: "compression-top",
    name: "Compression Top",
    description:
      "Second-skin compression top that supports muscle stability and keeps you dry through high-output sessions.",
    priceMinor: 190000,
    categorySlug: "compression-shirts",
    // A flagship — sorted first on the products page.
    featured: true,
    variants: v([
      ["XS", 5],
      // The e2e suite places several compression-top "S" orders; per-test
      // reseed (tests/e2e/fixtures.ts) restores this before each test, so a
      // normal stock value is enough — no accumulation across the suite. M
      // stays 0 (OOS) and XL low for the out-of-stock / low-stock assertions.
      ["S", 20],
      ["M", 0],
      ["L", 6],
      ["XL", 2],
    ]),
    imageCount: 2,
  },
  {
    slug: "compression-long-sleeve",
    name: "Compression Long-Sleeve",
    description:
      "Long-sleeve compression shirt with four-way stretch and flat seams — base-layer warmth without the bulk.",
    priceMinor: 230000,
    categorySlug: "compression-shirts",
    featured: false,
    variants: v([
      ["S", 10],
      ["M", 8],
      ["L", 6],
      ["XL", 3],
    ]),
    imageCount: 2,
  },
  // --- MMA Shorts ---
  {
    slug: "mma-fight-shorts",
    name: "MMA Fight Shorts",
    description:
      "Stretch-panel MMA fight shorts with a hook-and-loop closure and internal drawcord for a locked-in fit.",
    priceMinor: 280000,
    categorySlug: "mma-shorts",
    // A flagship — sorted first on the products page.
    featured: true,
    variants: v([
      ["S", 7],
      ["M", 10],
      ["L", 8],
      ["XL", 4],
    ]),
    imageCount: 3,
  },
  {
    slug: "mma-grappling-shorts",
    name: "MMA Grappling Shorts",
    description:
      "Compression-lined grappling shorts with flat seams. Currently sold out across all sizes.",
    priceMinor: 260000,
    categorySlug: "mma-shorts",
    featured: false,
    variants: v([
      ["S", 0],
      ["M", 0],
      ["L", 0],
      ["XL", 0],
    ]),
    imageCount: 2,
  },
  // --- Accessories (one-size; a single "M" variant) ---
  {
    slug: "premium-baseball-cap",
    name: "Premium Baseball Cap",
    description:
      "Structured six-panel cap in heavy brushed cotton with a curved brim and the Aucto mark — everyday, gym to street.",
    priceMinor: 95000,
    categorySlug: "accessories",
    featured: false,
    variants: v([["M", 30]]),
    imageCount: 2,
  },
  {
    slug: "gym-wrist-support",
    name: "Gym Wrist Support",
    description:
      "Adjustable wrist wraps for pressing and Olympic lifts — firm support with a hook-and-loop cinch.",
    priceMinor: 70000,
    categorySlug: "accessories",
    featured: false,
    variants: v([["M", 40]]),
    imageCount: 2,
  },
  {
    slug: "boxing-hand-wraps",
    name: "Boxing Hand Wraps",
    description:
      "Semi-elastic 4.5m cotton hand wraps with a thumb loop and hook-and-loop closure — protect the knuckles and wrist.",
    priceMinor: 55000,
    categorySlug: "accessories",
    featured: false,
    variants: v([["M", 50]]),
    imageCount: 2,
  },
  {
    slug: "pre-wrapped-hand-wrist-support",
    name: "Pre-Wrapped Hand & Wrist Support",
    description:
      "Slip-on pre-wrapped hand and wrist support — the protection of wraps without the wrapping, ready in seconds.",
    priceMinor: 65000,
    categorySlug: "accessories",
    featured: false,
    variants: v([["M", 35]]),
    imageCount: 2,
  },
];

export type SeedCounts = {
  categories: number;
  products: number;
  variants: number;
  images: number;
};

// Clear-and-reseed in one transaction. TRUNCATE … RESTART IDENTITY resets the
// serial sequences so product/variant IDs are IDENTICAL on every reseed — this
// matters for the e2e harness: Next's unstable_cache (storefront PDP/catalog)
// persists across the server process, so a per-test reseed that changed IDs
// would leave the cached PDP serving stale variant IDs and add-to-cart would
// hit an FK violation. Stable IDs keep the cache valid. CASCADE clears the
// child tables (order_items/cart_items/images/variants) in one shot; users are
// left intact (e2e creates unique-email accounts).
export async function seedDatabase(db: PostgresJsDatabase<typeof schema>): Promise<SeedCounts> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      TRUNCATE TABLE
        ${schema.orderItems}, ${schema.orders}, ${schema.cartItems}, ${schema.carts},
        ${schema.productImages}, ${schema.productVariants}, ${schema.products},
        ${schema.categories}
      RESTART IDENTITY CASCADE
    `);

    const insertedCategories = await tx.insert(schema.categories).values(categorySeed).returning();
    const categoryIdBySlug = new Map(insertedCategories.map((c) => [c.slug, c.id]));

    for (const p of productSeed) {
      const categoryId = categoryIdBySlug.get(p.categorySlug);
      if (categoryId === undefined) {
        throw new Error(`Unknown category slug: ${p.categorySlug}`);
      }

      const [product] = await tx
        .insert(schema.products)
        .values({
          slug: p.slug,
          name: p.name,
          description: p.description,
          priceMinor: p.priceMinor,
          categoryId,
          featured: p.featured,
          status: "published",
        })
        .returning();
      if (!product) throw new Error(`Failed to insert product: ${p.slug}`);

      await tx.insert(schema.productVariants).values(
        p.variants.map((variant) => ({
          productId: product.id,
          size: variant.size,
          sku: `AUC-${p.slug}-${variant.size}`.toUpperCase(),
          stock: variant.stock,
        })),
      );

      await tx.insert(schema.productImages).values(
        Array.from({ length: p.imageCount }, (_, i) => ({
          productId: product.id,
          placeholderKey: `${p.slug}-${i + 1}`,
          alt: `${p.name} — view ${i + 1}`,
          position: i,
        })),
      );
    }
  });

  const [categories, products, variants, images] = await Promise.all([
    db.$count(schema.categories),
    db.$count(schema.products),
    db.$count(schema.productVariants),
    db.$count(schema.productImages),
  ]);
  return { categories, products, variants, images };
}
