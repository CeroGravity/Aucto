import Image from "next/image";

import { cn } from "@/lib/utils";

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function placeholderSrc(key: string): string {
  const hue = hashKey(key) % 360;
  // Low-saturation neutral tints — calm, monochrome-leaning, Nike-clean.
  const bg = `hsl(${hue}, 12%, 91%)`;
  const fg = `hsl(${hue}, 14%, 80%)`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='400' height='400' fill='${bg}'/><circle cx='200' cy='168' r='72' fill='${fg}'/><rect x='86' y='250' width='228' height='30' rx='15' fill='${fg}'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

type ProductImageProps = {
  placeholderKey: string;
  // When set, a real uploaded image is served from the public route; otherwise
  // the deterministic placeholder renders.
  storageKey?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

// Storefront product image. Uploaded images (public namespace) are served via
// /api/images/<key> through next/image (optimizable); products with no upload
// fall back to the deterministic placeholder (data-URI, unoptimized).
export function ProductImage({
  placeholderKey,
  storageKey,
  alt,
  className,
  sizes,
  priority,
}: ProductImageProps) {
  const uploaded = Boolean(storageKey);
  const src = uploaded ? `/api/images/${storageKey}` : placeholderSrc(placeholderKey);
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
      className={cn("object-cover", className)}
      unoptimized={!uploaded}
      priority={priority}
    />
  );
}
