import { isPublishedSlug } from "@/server/queries/products";

// Existence probe for the storefront PDP, used by the Edge middleware to decide
// a real 404 (the Edge runtime can't query Drizzle directly, and Node-runtime
// middleware isn't available on this Next version). isPublishedSlug is
// tag-cached (PRODUCTS_TAG), so a warm probe is a cache HIT — no DB query — and
// is busted on product mutations. Returns 204 if published, 404 otherwise.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const published = await isPublishedSlug(slug);
  return new Response(null, { status: published ? 204 : 404 });
}
