import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/components/features/change-password-form";
import { PhoneSettings } from "@/components/features/phone-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { formatPriceMinor } from "@/lib/money";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/order-status";
import { logoutUser } from "@/server/actions/auth";
import { getOrdersForUser } from "@/server/queries/order";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Two scoped reads: the user's own profile + their own orders (filtered by
  // userId — no IDOR). Orders link to their own access-token detail page.
  const [user, orders] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { name: true, email: true, phone: true },
    }),
    getOrdersForUser(session.user.id),
  ]);

  return (
    <Container className="max-w-2xl py-16">
      <h1 className="font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Account
      </h1>

      {/* Profile */}
      <section aria-labelledby="profile-heading" className="mt-10">
        <h2 id="profile-heading" className="font-display font-bold text-primary text-xl">
          Profile
        </h2>
        <dl className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">Name</dt>
            <dd className="font-medium">{user?.name ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">Email</dt>
            <dd className="font-medium">{user?.email ?? session.user.email}</dd>
          </div>
        </dl>
        <div className="mt-4">
          <PhoneSettings phone={user?.phone ?? null} />
        </div>
      </section>

      <Separator className="my-10" />

      {/* Order history */}
      <section aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="font-display font-bold text-primary text-xl">
          Order history
        </h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-muted-foreground">No orders yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {orders.map((order) => {
              const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
              return (
                <li key={order.id}>
                  <Link
                    href={`/order/${order.accessToken}`}
                    className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Order #{order.id}</span>
                      <span className="text-muted-foreground text-sm">
                        {dateFmt.format(order.createdAt)} · {itemCount}{" "}
                        {itemCount === 1 ? "item" : "items"} · {formatPriceMinor(order.totalMinor)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ORDER_STATUS_LABEL[order.orderStatus]}</Badge>
                      <Badge variant="secondary">{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Separator className="my-10" />

      {/* Security */}
      <section aria-labelledby="security-heading">
        <h2 id="security-heading" className="font-display font-bold text-primary text-xl">
          Security
        </h2>

        <h3 className="mt-4 font-medium text-sm">Change password</h3>
        <div className="mt-3">
          <ChangePasswordForm />
        </div>

        <h3 className="mt-8 font-medium text-sm">Two-factor authentication</h3>
        <p className="mt-2 text-muted-foreground text-sm">
          Two-factor authentication isn’t available yet — controls will appear here in an upcoming
          release.
        </p>
        <Button variant="outline" size="sm" disabled aria-disabled className="mt-3 w-fit">
          Set up 2FA (coming soon)
        </Button>
      </section>

      <Separator className="my-10" />

      {/* Sign out */}
      <form action={logoutUser}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </Container>
  );
}
