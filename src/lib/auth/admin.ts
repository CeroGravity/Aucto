import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// Server-side admin gate for pages/layouts:
// - logged out → redirect to /login
// - logged-in non-admin → notFound() (no PII, no forbidden-detail leak)
export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin/orders");
  if (session.user.role !== "admin") notFound();
  return session.user;
}

// Server-side admin gate for Server Actions. Throws on non-admin (callers
// surface a generic error). Never trust hidden UI — every action calls this.
export async function assertAdminAction() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session.user;
}
