"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Size } from "@/lib/db/schema";
import { SIZES } from "@/lib/products";
import { addVariant, removeVariant, setVariantStock } from "@/server/actions/admin-products";

const inputClass =
  "h-9 w-24 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Variant = { id: number; size: Size; stock: number };

export function VariantEditor({ productId, variants }: { productId: number; variants: Variant[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newSize, setNewSize] = useState<Size | "">("");
  const [newStock, setNewStock] = useState("0");

  const usedSizes = new Set(variants.map((v) => v.size));
  const availableSizes = SIZES.filter((s) => !usedSizes.has(s));

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {variants.length === 0 ? (
          <p className="text-muted-foreground text-sm">No sizes yet.</p>
        ) : (
          variants.map((v) => (
            <div key={v.id} className="flex items-center gap-3">
              <span className="w-10 font-medium text-sm">{v.size}</span>
              <input
                type="number"
                min={0}
                aria-label={`Stock for ${v.size}`}
                defaultValue={v.stock}
                className={inputClass}
                onBlur={(e) => {
                  const stock = Number(e.currentTarget.value);
                  if (stock !== v.stock) {
                    run(() => setVariantStock({ variantId: v.id, stock }));
                  }
                }}
              />
              <button
                type="button"
                aria-label={`Remove ${v.size}`}
                disabled={pending}
                onClick={() => run(() => removeVariant(v.id))}
                className="rounded-sm p-1 text-muted-foreground hover:text-destructive disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {availableSizes.length > 0 ? (
        <div className="flex items-end gap-3 border-border border-t pt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Size</span>
            <select
              aria-label="New size"
              value={newSize}
              onChange={(e) => setNewSize(e.target.value as Size | "")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">Choose…</option>
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground text-xs">Stock</span>
            <input
              type="number"
              min={0}
              aria-label="New stock"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className={inputClass}
            />
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={pending || newSize === ""}
            onClick={() => {
              if (newSize === "") return;
              run(() => addVariant(productId, { size: newSize, stock: Number(newStock) }));
              setNewSize("");
              setNewStock("0");
            }}
          >
            <Plus className="size-4" /> Add size
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-destructive-text text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
