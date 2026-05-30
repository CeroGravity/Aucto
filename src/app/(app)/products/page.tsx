import type { Metadata } from "next";

import { CategoryFilter } from "@/components/features/category-filter";
import { ProductCard } from "@/components/features/product-card";
import { Container } from "@/components/ui/container";
import { getCategories } from "@/server/queries/categories";
import { getProducts } from "@/server/queries/products";

export const metadata: Metadata = { title: "Products" };

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : undefined;

  const [categories, products] = await Promise.all([getCategories(), getProducts({ category })]);

  const activeCategory = category ? categories.find((c) => c.slug === category) : undefined;
  const heading = activeCategory ? activeCategory.name : "Shop all";

  return (
    <Container className="py-12 md:py-16">
      <div className="flex flex-col gap-6">
        <h1 className="font-display font-bold text-4xl tracking-tight md:text-5xl">{heading}</h1>
        <CategoryFilter categories={categories} active={category} />
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-muted-foreground">No products found in this category.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </Container>
  );
}
