import { type NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { storageProvider } from "@/lib/storage";

// Role-gated retrieval of a payment screenshot. Admin only — never a public or
// guessable URL. (The admin UI that consumes this lands in 5d.)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { key } = await params;
  const file = await storageProvider.get(key);
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
    },
  });
}
