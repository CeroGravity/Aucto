import { type NextRequest, NextResponse } from "next/server";

import { isPublicKey, storageProvider } from "@/lib/storage";

// Public product-image serving — unauthenticated, but CONFINED to the public
// (pub_) namespace. A private screenshot key (prv_ / legacy bare) fails
// isPublicKey and is refused, so this route can never expose a payment proof.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!isPublicKey(key)) return new NextResponse("Not found", { status: 404 });

  const file = await storageProvider.get(key);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      // Public, immutable (keys are content-random) — safe to cache hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
