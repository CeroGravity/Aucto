import { and, count, desc, eq, or, type SQL, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { OrderLifecycle, PaymentMethod, PaymentStatusValue } from "@/lib/db/schema";
import { orders } from "@/lib/db/schema";

export const PAGE_SIZE = 20;

export type OrderListFilters = {
  orderStatus?: OrderLifecycle;
  paymentStatus?: PaymentStatusValue;
  method?: PaymentMethod;
  search?: string;
  page?: number;
};

export type AdminOrderRow = {
  id: number;
  createdAt: Date;
  fullName: string;
  totalMinor: number;
  paymentMethod: PaymentMethod;
  orderStatus: OrderLifecycle;
  paymentStatus: PaymentStatusValue;
};

export async function listOrders(filters: OrderListFilters): Promise<{
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const conditions: SQL[] = [];

  if (filters.orderStatus) {
    conditions.push(eq(orders.orderStatus, filters.orderStatus));
  }
  if (filters.paymentStatus) {
    conditions.push(eq(orders.paymentStatus, filters.paymentStatus));
  }
  if (filters.method) {
    conditions.push(eq(orders.paymentMethod, filters.method));
  }
  if (filters.search) {
    const term = filters.search.trim();
    const idMatch = /^\d+$/.test(term) ? eq(orders.id, Number(term)) : undefined;
    const like = `%${term}%`;
    const searchCond = or(
      idMatch,
      sql`${orders.phone} ilike ${like}`,
      sql`${orders.trxId} ilike ${like}`,
    );
    if (searchCond) conditions.push(searchCond);
  }

  const where = conditions.length ? and(...conditions) : undefined;

  // Actionable first: awaiting_verification, then pending, then newest.
  const actionableRank = sql<number>`case
    when ${orders.paymentStatus} = 'awaiting_verification' then 0
    when ${orders.orderStatus} = 'pending' then 1
    else 2 end`;

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: orders.id,
        createdAt: orders.createdAt,
        fullName: orders.fullName,
        totalMinor: orders.totalMinor,
        paymentMethod: orders.paymentMethod,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(where)
      .orderBy(actionableRank, desc(orders.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(orders).where(where),
  ]);

  const total = totalRow[0]?.value ?? 0;
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

// One relational query: order + items.
export async function getAdminOrder(id: number) {
  return db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { items: true },
  });
}

export type AdminOrderDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
