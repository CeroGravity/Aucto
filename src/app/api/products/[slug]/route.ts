import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

// Existence probe for the storefront PDP, used by the Edge middleware to decide
// a real 404 (the Edge runtime can't query Drizzle directly, and Node-runtime
// middleware isn't available on this Next version). Returns 204 if the slug is a
// PUBLISHED product (mirrors getProductBySlug), 404 otherwise. Runs on the Node
// runtime (default for route handlers), so Drizzle/postgres-js work.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const found = await db.query.products.findFirst({
    columns: { id: true },
    where: and(eq(products.slug, slug), eq(products.status, "published")),
  });
  return new Response(null, { status: found ? 204 : 404 });
}
