"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { assertAdminAction } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { orderItems, productImages, products, productVariants } from "@/lib/db/schema";
import { parseTakaToMinor } from "@/lib/money";
import { productFormSchema, productSlug, stockAdjustSchema, variantSchema } from "@/lib/products";
import { storageProvider } from "@/lib/storage";
import { validateImageUpload } from "@/lib/uploads";
import { PRODUCTS_TAG } from "@/server/queries/products";

export type ProductActionResult = { ok: true; id: number } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

const idSchema = z.coerce.number().int().positive();

function revalidate(id?: number) {
  // Bust the tag-cached storefront reads (catalog, PDP, existence probe) so
  // published-state / price / stock-display refresh immediately — no stale.
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  // Refresh every storefront PDP instance (price/status/variant edits).
  revalidatePath("/products/[slug]", "page");
  if (id) revalidatePath(`/admin/products/${id}`);
}

// Ensure a unique slug (append -2, -3, … on collision).
async function uniqueSlug(name: string, excludeId?: number): Promise<string> {
  const base = productSlug(name) || "product";
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await db.query.products.findFirst({
      where: eq(products.slug, candidate),
      columns: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function createProduct(input: unknown): Promise<ProductActionResult> {
  await assertAdminAction();
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const priceMinor = parseTakaToMinor(parsed.data.price);
  if (priceMinor === null) return { ok: false, error: "Enter a valid price." };

  const slug = await uniqueSlug(parsed.data.name);
  const [created] = await db
    .insert(products)
    .values({
      slug,
      name: parsed.data.name,
      description: parsed.data.description,
      priceMinor,
      categoryId: parsed.data.categoryId,
      status: parsed.data.published ? "published" : "draft",
    })
    .returning({ id: products.id });
  if (!created) return { ok: false, error: "Could not create product." };

  // Default placeholder image so the storefront card/PDP render.
  await db.insert(productImages).values({
    productId: created.id,
    placeholderKey: `${slug}-1`,
    alt: `${parsed.data.name} — view 1`,
    position: 0,
  });

  revalidate(created.id);
  return { ok: true, id: created.id };
}

export async function updateProduct(rawId: unknown, input: unknown): Promise<ProductActionResult> {
  await assertAdminAction();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid product." };
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const priceMinor = parseTakaToMinor(parsed.data.price);
  if (priceMinor === null) return { ok: false, error: "Enter a valid price." };

  const current = await db.query.products.findFirst({
    where: eq(products.id, id.data),
    columns: { id: true, status: true },
  });
  if (!current) return { ok: false, error: "Product not found." };

  // Editing the publish toggle never resurrects an archived product here;
  // archive is its own action.
  const status =
    current.status === "archived" ? "archived" : parsed.data.published ? "published" : "draft";

  await db
    .update(products)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      priceMinor,
      categoryId: parsed.data.categoryId,
      status,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id.data));

  revalidate(id.data);
  return { ok: true, id: id.data };
}

async function setStatus(
  rawId: unknown,
  status: "draft" | "published" | "archived",
): Promise<SimpleResult> {
  await assertAdminAction();
  const id = idSchema.safeParse(rawId);
  if (!id.success) return { ok: false, error: "Invalid product." };
  await db.update(products).set({ status, updatedAt: new Date() }).where(eq(products.id, id.data));
  revalidate(id.data);
  return { ok: true };
}

export async function publishProduct(id: unknown): Promise<SimpleResult> {
  return setStatus(id, "published");
}
export async function unpublishProduct(id: unknown): Promise<SimpleResult> {
  return setStatus(id, "draft");
}
// Archive instead of hard delete — keeps order_items FK + history intact.
export async function archiveProduct(id: unknown): Promise<SimpleResult> {
  return setStatus(id, "archived");
}

export async function addVariant(rawProductId: unknown, input: unknown): Promise<SimpleResult> {
  await assertAdminAction();
  const productId = idSchema.safeParse(rawProductId);
  if (!productId.success) return { ok: false, error: "Invalid product." };
  const parsed = variantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid variant." };
  }

  const existing = await db.query.productVariants.findFirst({
    where: and(
      eq(productVariants.productId, productId.data),
      eq(productVariants.size, parsed.data.size),
    ),
    columns: { id: true },
  });
  if (existing) return { ok: false, error: `Size ${parsed.data.size} already exists.` };

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId.data),
    columns: { slug: true },
  });
  if (!product) return { ok: false, error: "Product not found." };

  await db.insert(productVariants).values({
    productId: productId.data,
    size: parsed.data.size,
    sku: `AUC-${product.slug}-${parsed.data.size}`.toUpperCase(),
    stock: parsed.data.stock,
  });
  revalidate(productId.data);
  return { ok: true };
}

export async function setVariantStock(input: unknown): Promise<SimpleResult> {
  await assertAdminAction();
  const parsed = stockAdjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid stock." };
  }
  const updated = await db
    .update(productVariants)
    .set({ stock: parsed.data.stock })
    .where(eq(productVariants.id, parsed.data.variantId))
    .returning({ productId: productVariants.productId });
  const productId = updated[0]?.productId;
  if (productId === undefined) return { ok: false, error: "Variant not found." };
  revalidate(productId);
  return { ok: true };
}

// A variant referenced by any order cannot be hard-deleted (FK + history).
export async function removeVariant(rawVariantId: unknown): Promise<SimpleResult> {
  await assertAdminAction();
  const variantId = idSchema.safeParse(rawVariantId);
  if (!variantId.success) return { ok: false, error: "Invalid variant." };

  const referenced = await db.query.orderItems.findFirst({
    where: eq(orderItems.variantId, variantId.data),
    columns: { id: true },
  });
  if (referenced) {
    return {
      ok: false,
      error: "This size has order history and can't be deleted. Set its stock to 0 instead.",
    };
  }

  const deleted = await db
    .delete(productVariants)
    .where(eq(productVariants.id, variantId.data))
    .returning({ productId: productVariants.productId });
  const productId = deleted[0]?.productId;
  if (productId === undefined) return { ok: false, error: "Variant not found." };
  revalidate(productId);
  return { ok: true };
}

// --- Product images (public assets) ---

// Upload a public image to a product. Validated server-side (MIME + magic byte
// + 5MB), stored in the PUBLIC namespace. First image becomes primary.
export async function uploadProductImage(
  rawProductId: unknown,
  formData: FormData,
): Promise<SimpleResult> {
  await assertAdminAction();
  const productId = idSchema.safeParse(rawProductId);
  if (!productId.success) return { ok: false, error: "Invalid product." };

  const upload = await validateImageUpload(formData.get("image"));
  if (!upload.ok) return { ok: false, error: upload.error };

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId.data),
    columns: { name: true },
    with: { images: { columns: { id: true, position: true, storageKey: true } } },
  });
  if (!product) return { ok: false, error: "Product not found." };

  const storageKey = await storageProvider.put(upload.image, "public");
  // Only UPLOADED images count for primary/order — placeholder-only rows (from
  // product creation / seed) are render-time fallbacks, not gallery images.
  const uploaded = product.images.filter((i) => i.storageKey);
  const isFirst = uploaded.length === 0;
  const nextPos = uploaded.reduce((max, i) => Math.max(max, i.position), -1) + 1;

  await db.insert(productImages).values({
    productId: productId.data,
    placeholderKey: `uploaded-${storageKey}`,
    storageKey,
    alt: product.name,
    isPrimary: isFirst,
    position: nextPos,
  });

  revalidate(productId.data);
  return { ok: true };
}

async function imageWithProduct(imageId: number) {
  return db.query.productImages.findFirst({
    where: eq(productImages.id, imageId),
    columns: { id: true, productId: true, storageKey: true },
  });
}

export async function setPrimaryImage(rawImageId: unknown): Promise<SimpleResult> {
  await assertAdminAction();
  const imageId = idSchema.safeParse(rawImageId);
  if (!imageId.success) return { ok: false, error: "Invalid image." };

  const image = await imageWithProduct(imageId.data);
  if (!image) return { ok: false, error: "Image not found." };

  await db.transaction(async (tx) => {
    await tx
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, image.productId));
    await tx.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, image.id));
  });

  revalidate(image.productId);
  return { ok: true };
}

const reorderSchema = z.object({
  imageId: z.coerce.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

// Swap an image with its neighbour in sortOrder (stable, race-free per product).
export async function reorderImage(input: unknown): Promise<SimpleResult> {
  await assertAdminAction();
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const image = await db.query.productImages.findFirst({
    where: eq(productImages.id, parsed.data.imageId),
    columns: { id: true, productId: true, position: true },
  });
  if (!image) return { ok: false, error: "Image not found." };

  const siblings = await db.query.productImages.findMany({
    where: eq(productImages.productId, image.productId),
    columns: { id: true, position: true },
    orderBy: (img, { asc }) => [asc(img.position)],
  });
  const index = siblings.findIndex((s) => s.id === image.id);
  const swapWith = parsed.data.direction === "up" ? siblings[index - 1] : siblings[index + 1];
  if (!swapWith) return { ok: true }; // already at the edge — no-op

  await db.transaction(async (tx) => {
    await tx
      .update(productImages)
      .set({ position: swapWith.position })
      .where(eq(productImages.id, image.id));
    await tx
      .update(productImages)
      .set({ position: image.position })
      .where(eq(productImages.id, swapWith.id));
  });

  revalidate(image.productId);
  return { ok: true };
}

export async function deleteProductImage(rawImageId: unknown): Promise<SimpleResult> {
  await assertAdminAction();
  const imageId = idSchema.safeParse(rawImageId);
  if (!imageId.success) return { ok: false, error: "Invalid image." };

  const image = await imageWithProduct(imageId.data);
  if (!image) return { ok: false, error: "Image not found." };

  const wasPrimary = await db.query.productImages.findFirst({
    where: eq(productImages.id, image.id),
    columns: { isPrimary: true },
  });

  await db.delete(productImages).where(eq(productImages.id, image.id));

  // If the deleted image was primary, promote the next remaining one.
  if (wasPrimary?.isPrimary) {
    const next = await db.query.productImages.findFirst({
      where: eq(productImages.productId, image.productId),
      orderBy: (img, { asc }) => [asc(img.position)],
      columns: { id: true },
    });
    if (next) {
      await db.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, next.id));
    }
  }

  revalidate(image.productId);
  return { ok: true };
}
