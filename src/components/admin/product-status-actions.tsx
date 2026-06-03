"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ProductStatus } from "@/lib/db/schema";
import { archiveProduct, publishProduct, unpublishProduct } from "@/server/actions/admin-products";

export function ProductStatusActions({
  productId,
  status,
}: {
  productId: number;
  status: ProductStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {status !== "published" && status !== "archived" ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishProduct(productId))}
          >
            Publish
          </Button>
        ) : null}
        {status === "published" ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => unpublishProduct(productId))}
          >
            Unpublish
          </Button>
        ) : null}
        {status !== "archived" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => archiveProduct(productId))}
          >
            Archive
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => unpublishProduct(productId))}
          >
            Restore to draft
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
