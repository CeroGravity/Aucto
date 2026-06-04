import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { productStatusEnum } from "@/lib/db/schema";
import { formatPriceMinor } from "@/lib/money";
import { listAdminProducts } from "@/server/queries/admin-products";
import { getCategories } from "@/server/queries/categories";

export const metadata: Metadata = { title: "Products — Admin" };

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-foreground text-background",
  archived: "bg-destructive/15 text-destructive-text",
};

type SearchParams = Promise<{
  status?: string;
  categoryId?: string;
  search?: string;
}>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const status = (productStatusEnum.enumValues as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof productStatusEnum.enumValues)[number])
    : undefined;
  const categoryId = sp.categoryId ? Number(sp.categoryId) : undefined;
  const search = sp.search?.trim() || undefined;

  const [rows, categories] = await Promise.all([
    listAdminProducts({ status, categoryId, search }),
    getCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-primary tracking-tight md:text-3xl">
          Products
        </h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {productStatusEnum.enumValues.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Category</span>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Search</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            className="h-9 w-56 rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm"
        >
          Apply
        </button>
        <Link
          href="/admin/products"
          className="h-9 rounded-md border border-border px-4 text-sm leading-9"
        >
          Reset
        </Link>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No products match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="relative border-border border-t hover:bg-muted/50 focus-within:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/products/${row.id}`}
                      aria-label={`Edit ${row.name}`}
                      className="font-medium text-primary after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.categoryName}</td>
                  <td className="px-4 py-3">{formatPriceMinor(row.priceMinor)}</td>
                  <td className="px-4 py-3">{row.totalStock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs capitalize ${STATUS_CLASS[row.status] ?? "bg-muted"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
