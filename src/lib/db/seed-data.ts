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
  { slug: "compression", name: "Compression" },
  { slug: "gym-shorts", name: "Gym Shorts" },
  { slug: "muay-thai-shorts", name: "Muay Thai Shorts" },
  { slug: "mma-shorts", name: "MMA Shorts" },
];

const v = (entries: Array<[Size, number]>): VariantSeed[] =>
  entries.map(([size, stock]) => ({ size, stock }));

export const productSeed: ProductSeed[] = [
  // compression
  {
    slug: "compression-long-tights",
    name: "Compression Long Tights",
    description:
      "Full-length compression tights with moisture-wicking, four-way stretch fabric. Built for training, recovery, and layering.",
    priceMinor: 220000,
    categorySlug: "compression",
    featured: true,
    variants: v([
      ["S", 12],
      ["M", 9],
      ["L", 7],
      ["XL", 4],
    ]),
    imageCount: 2,
  },
  {
    slug: "compression-top",
    name: "Compression Top",
    description:
      "Second-skin compression top that supports muscle stability and keeps you dry through high-output sessions.",
    priceMinor: 190000,
    categorySlug: "compression",
    featured: false,
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
    slug: "compression-shorts",
    name: "Compression Shorts",
    description:
      "Lightweight base-layer compression shorts with a wide, no-roll waistband for chafe-free training.",
    priceMinor: 150000,
    categorySlug: "compression",
    featured: false,
    variants: v([
      ["S", 14],
      ["M", 11],
      ["L", 9],
      ["XL", 6],
      ["XXL", 3],
    ]),
    imageCount: 2,
  },
  // gym-shorts
  {
    slug: "training-shorts-5in",
    name: 'Training Shorts 5"',
    description:
      "Short-cut training shorts with a liner and zip pocket. Range-of-motion gusset for squats and sprints.",
    priceMinor: 140000,
    categorySlug: "gym-shorts",
    featured: false,
    variants: v([
      ["S", 8],
      ["M", 0],
      ["L", 5],
      ["XL", 3],
    ]),
    imageCount: 2,
  },
  {
    slug: "performance-shorts-7in",
    name: 'Performance Shorts 7"',
    description:
      "Mid-length performance shorts in a breathable woven shell with hidden drawcord and back pocket.",
    priceMinor: 170000,
    categorySlug: "gym-shorts",
    featured: true,
    variants: v([
      ["S", 10],
      ["M", 12],
      ["L", 8],
      ["XL", 5],
    ]),
    imageCount: 2,
  },
  {
    slug: "lightweight-gym-shorts",
    name: "Lightweight Gym Shorts",
    description:
      "Ultra-light everyday gym shorts that pack down small and dry fast. Minimal, unisex cut.",
    priceMinor: 120000,
    categorySlug: "gym-shorts",
    featured: false,
    variants: v([
      ["XS", 4],
      ["S", 7],
      ["M", 9],
      ["L", 0],
      ["XL", 4],
    ]),
    imageCount: 2,
  },
  // muay-thai-shorts
  {
    slug: "muay-thai-shorts-classic",
    name: "Muay Thai Shorts — Classic",
    description:
      "Traditional wide-cut Muay Thai shorts in satin with a high side split for unrestricted kicks.",
    priceMinor: 250000,
    categorySlug: "muay-thai-shorts",
    featured: false,
    variants: v([
      ["S", 9],
      ["M", 7],
      ["L", 6],
      ["XL", 3],
    ]),
    imageCount: 3,
  },
  {
    slug: "muay-thai-shorts-pro",
    name: "Muay Thai Shorts — Pro",
    description:
      "Pro-grade Muay Thai shorts with reinforced stitching and a wide elastic waistband for fight-night durability.",
    priceMinor: 320000,
    categorySlug: "muay-thai-shorts",
    featured: true,
    variants: v([
      ["S", 6],
      ["M", 8],
      ["L", 5],
      ["XL", 2],
    ]),
    imageCount: 3,
  },
  {
    slug: "muay-thai-shorts-elite",
    name: "Muay Thai Shorts — Elite",
    description:
      "Lightweight micro-satin Muay Thai shorts engineered for speed, with a curved hem for full leg extension.",
    priceMinor: 380000,
    categorySlug: "muay-thai-shorts",
    featured: false,
    variants: v([
      ["M", 4],
      ["L", 3],
      ["XL", 0],
    ]),
    imageCount: 2,
  },
  // mma-shorts
  {
    slug: "mma-fight-shorts",
    name: "MMA Fight Shorts",
    description:
      "Stretch-panel MMA fight shorts with a hook-and-loop closure and internal drawcord for a locked-in fit.",
    priceMinor: 280000,
    categorySlug: "mma-shorts",
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
    slug: "mma-hybrid-shorts",
    name: "MMA Hybrid Shorts",
    description:
      "Hybrid MMA shorts that move from cage to gym — abrasion-resistant shell with deep four-way stretch.",
    priceMinor: 300000,
    categorySlug: "mma-shorts",
    featured: false,
    variants: v([
      ["S", 5],
      ["M", 6],
      ["L", 0],
      ["XL", 3],
    ]),
    imageCount: 2,
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
