import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { ProductImages } from "@/components/admin/product-images";
import { ProductStatusActions } from "@/components/admin/product-status-actions";
import { VariantEditor } from "@/components/admin/variant-editor";
import { minorToTakaInput } from "@/lib/money";
import { updateProduct } from "@/server/actions/admin-products";
import { getAdminProduct } from "@/server/queries/admin-products";
import { getCategories } from "@/server/queries/categories";

export const metadata: Metadata = { title: "Edit product — Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const [product, categories] = await Promise.all([getAdminProduct(productId), getCategories()]);
  if (!product) notFound();

  // Bind the product id so the form's action matches the (input) signature.
  async function action(input: {
    name: string;
    description: string;
    categoryId: number;
    price: string;
    published: boolean;
  }) {
    "use server";
    return updateProduct(productId, input);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/products"
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← All products
        </Link>
        <h1 className="font-display font-bold text-2xl text-primary tracking-tight md:text-3xl">
          {product.name}
        </h1>
        <span
          data-testid="product-status"
          className="inline-flex rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs capitalize"
        >
          {product.status}
        </span>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Status</h2>
        <ProductStatusActions productId={product.id} status={product.status} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Details</h2>
        <ProductForm
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          defaults={{
            name: product.name,
            description: product.description,
            categoryId: product.categoryId,
            price: minorToTakaInput(product.priceMinor),
            published: product.status === "published",
          }}
          action={action}
          submitLabel="Save changes"
        />
      </section>

      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="font-semibold text-lg">Sizes &amp; stock</h2>
        <VariantEditor
          productId={product.id}
          variants={product.variants.map((v) => ({
            id: v.id,
            size: v.size,
            stock: v.stock,
          }))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-lg">Images</h2>
        <ProductImages
          productId={product.id}
          images={product.images.map((img) => ({
            id: img.id,
            storageKey: img.storageKey,
            isPrimary: img.isPrimary,
          }))}
        />
      </section>
    </div>
  );
}
