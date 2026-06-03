import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badge";
import { orderLifecycleEnum, paymentMethodEnum, paymentStatusEnum } from "@/lib/db/schema";
import { formatPriceMinor } from "@/lib/money";
import { listOrders } from "@/server/queries/admin-orders";

export const metadata: Metadata = { title: "Orders — Admin" };

type SearchParams = Promise<{
  orderStatus?: string;
  paymentStatus?: string;
  method?: string;
  search?: string;
  page?: string;
}>;

function pick<T extends readonly string[]>(
  values: T,
  value: string | undefined,
): T[number] | undefined {
  return value && (values as readonly string[]).includes(value) ? (value as T[number]) : undefined;
}

function buildQuery(
  base: Record<string, string | undefined>,
  override: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...override })) {
    if (v) params.set(k, v);
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const orderStatus = pick(orderLifecycleEnum.enumValues, sp.orderStatus);
  const paymentStatus = pick(paymentStatusEnum.enumValues, sp.paymentStatus);
  const method = pick(paymentMethodEnum.enumValues, sp.method);
  const search = sp.search?.trim() || undefined;
  const page = sp.page ? Number(sp.page) : 1;

  const { rows, total, pageCount } = await listOrders({
    orderStatus,
    paymentStatus,
    method,
    search,
    page,
  });

  const current = {
    orderStatus,
    paymentStatus,
    method,
    search,
  };

  return (
    <div className="mt-2">
      <h1 className="font-display font-bold text-2xl text-primary tracking-tight md:text-3xl">
        Orders
      </h1>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Order status</span>
          <select
            name="orderStatus"
            defaultValue={orderStatus ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {orderLifecycleEnum.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Payment status</span>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {paymentStatusEnum.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Method</span>
          <select
            name="method"
            defaultValue={method ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All</option>
            {paymentMethodEnum.enumValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Search (order # / phone / TrxID)</span>
          <input
            name="search"
            defaultValue={search ?? ""}
            className="h-9 w-56 rounded-md border border-input bg-background px-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm"
        >
          Apply
        </button>
        <Link
          href="/admin/orders"
          className="h-9 rounded-md border border-border px-4 text-sm leading-9"
        >
          Reset
        </Link>
      </form>

      <p className="mt-4 text-muted-foreground text-sm">{total} order(s)</p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No orders match these filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                // Stretched-link pattern: the row is positioned, and the order
                // link's ::after overlay covers the whole row — so a click
                // anywhere opens the order, while keeping a real keyboard-
                // focusable anchor and native cmd/ctrl-click (new tab).
                <tr
                  key={row.id}
                  className="group relative border-border border-t transition-colors hover:bg-muted/50 focus-within:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${row.id}`}
                      aria-label={`Open order ${row.id}`}
                      className="font-medium text-primary underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {row.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{row.fullName}</td>
                  <td className="px-4 py-3">{formatPriceMinor(row.totalMinor)}</td>
                  <td className="px-4 py-3">{row.paymentMethod}</td>
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

      {pageCount > 1 ? (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 ? (
            <Link
              href={`/admin/orders${buildQuery(current, { page: String(page - 1) })}`}
              className="rounded-md border border-border px-3 py-1.5"
            >
              Previous
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={`/admin/orders${buildQuery(current, { page: String(page + 1) })}`}
              className="rounded-md border border-border px-3 py-1.5"
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
