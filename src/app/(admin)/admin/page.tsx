import type { Metadata } from "next";
import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { formatPriceMinor } from "@/lib/money";
import { getDashboardData } from "@/server/queries/admin-dashboard";

export const metadata: Metadata = { title: "Dashboard — Admin" };

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display font-bold text-2xl text-primary tracking-tight md:text-3xl">
        Dashboard
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Awaiting verification"
          value={data.awaitingVerification}
          href="/admin/orders?paymentStatus=awaiting_verification"
          highlight
        />
        <StatCard
          label="To confirm"
          value={data.toConfirm}
          href="/admin/orders?orderStatus=pending"
          highlight
        />
        <StatCard
          label="To ship"
          value={data.toShip}
          href="/admin/orders?orderStatus=confirmed"
          highlight
        />
        <StatCard label="Orders today" value={data.todayCount} />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Recent orders</h2>
          <Link
            href="/admin/orders"
            className="text-primary text-sm underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                data.recent.map((row) => (
                  <tr key={row.id} className="border-border border-t">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {row.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{row.fullName}</td>
                    <td className="px-4 py-3">{formatPriceMinor(row.totalMinor)}</td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={row.orderStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={row.paymentStatus} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
