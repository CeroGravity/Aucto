"use client";

import { ChevronDown, ChevronUp, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteProductImage,
  reorderImage,
  setPrimaryImage,
  uploadProductImage,
} from "@/server/actions/admin-products";

type Img = {
  id: number;
  storageKey: string | null;
  isPrimary: boolean;
};

export function ProductImages({ productId, images }: { productId: number; images: Img[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Only uploaded images (storageKey set) are managed here; placeholder rows
  // are ignored.
  const uploaded = images.filter((i) => i.storageKey);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("image", file);
    setError(null);
    startTransition(async () => {
      const r = await uploadProductImage(productId, fd);
      if (r.ok) {
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {uploaded.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No images yet — the storefront shows a placeholder.
          </p>
        ) : (
          uploaded.map((img, i) => (
            <div
              key={img.id}
              className="relative flex w-32 flex-col gap-2 rounded-md border border-border p-2"
            >
              {/* Admin preview via the public route (small, not next/image). */}
              {/* biome-ignore lint/performance/noImgElement: admin thumbnail, not storefront-optimizable */}
              <img
                src={`/api/images/${img.storageKey}`}
                alt="Product"
                className="aspect-square w-full rounded object-cover"
              />
              {img.isPrimary ? (
                <span className="absolute top-1 left-1 rounded bg-foreground px-1.5 py-0.5 font-medium text-[10px] text-background">
                  Primary
                </span>
              ) : null}
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label="Make primary"
                  disabled={pending || img.isPrimary}
                  onClick={() => run(() => setPrimaryImage(img.id))}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Star className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move earlier"
                  disabled={pending || i === 0}
                  onClick={() => run(() => reorderImage({ imageId: img.id, direction: "up" }))}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move later"
                  disabled={pending || i === uploaded.length - 1}
                  onClick={() => run(() => reorderImage({ imageId: img.id, direction: "down" }))}
                  className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete image"
                  disabled={pending}
                  onClick={() => run(() => deleteProductImage(img.id))}
                  className="rounded-sm p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3 border-border border-t pt-4">
        <input
          ref={fileRef}
          type="file"
          aria-label="Upload image"
          accept="image/png,image/jpeg,image/webp"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-medium file:text-secondary-foreground file:text-sm"
        />
        <Button type="button" variant="outline" disabled={pending} onClick={onUpload}>
          Upload
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">JPEG, PNG, or WebP — max 5MB.</p>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
