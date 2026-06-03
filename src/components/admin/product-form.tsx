"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ProductActionResult } from "@/server/actions/admin-products";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export type CategoryOption = { id: number; name: string };

export type ProductFormDefaults = {
  name?: string;
  description?: string;
  categoryId?: number;
  price?: string;
  published?: boolean;
};

export function ProductForm({
  categories,
  defaults,
  action,
  submitLabel,
}: {
  categories: CategoryOption[];
  defaults?: ProductFormDefaults;
  action: (input: {
    name: string;
    description: string;
    categoryId: number;
    price: string;
    published: boolean;
  }) => Promise<ProductActionResult>;
  submitLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      categoryId: Number(fd.get("categoryId") ?? 0),
      price: String(fd.get("price") ?? ""),
      published: fd.get("published") === "on",
    };
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        router.push(`/admin/products/${result.id}`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="font-medium text-sm">
          Name
        </label>
        <input id="name" name="name" defaultValue={defaults?.name ?? ""} className={inputClass} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="font-medium text-sm">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaults?.description ?? ""}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="categoryId" className="font-medium text-sm">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={defaults?.categoryId ?? ""}
            className={inputClass}
          >
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="price" className="font-medium text-sm">
            Price (৳)
          </label>
          <input
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={defaults?.price ?? ""}
            placeholder="2500"
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaults?.published ?? false}
          className="size-4"
        />
        Published (visible on the storefront)
      </label>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
