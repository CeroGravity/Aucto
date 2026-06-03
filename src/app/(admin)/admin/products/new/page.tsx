import type { Metadata } from "next";

import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/server/actions/admin-products";
import { getCategories } from "@/server/queries/categories";

export const metadata: Metadata = { title: "New product — Admin" };

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display font-bold text-2xl text-primary tracking-tight md:text-3xl">
        New product
      </h1>
      <p className="text-muted-foreground text-sm">
        Add sizes &amp; stock after creating. A placeholder image is used until real photos are
        uploaded.
      </p>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        action={createProduct}
        submitLabel="Create product"
      />
    </div>
  );
}
