import { desc, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import type { OrderLifecycle, PaymentMethod, PaymentStatusValue } from "@/lib/db/schema";
import { orders } from "@/lib/db/schema";

export type DashboardRecentOrder = {
  id: number;
  createdAt: Date;
  fullName: string;
  totalMinor: number;
  paymentMethod: PaymentMethod;
  orderStatus: OrderLifecycle;
  paymentStatus: PaymentStatusValue;
};

export type DashboardData = {
  awaitingVerification: number;
  toConfirm: number;
  toShip: number;
  todayCount: number;
  recent: DashboardRecentOrder[];
};

// Actionable counts + today + recent, computed with parallel aggregates.
// The four scalar counts are a single grouped/filtered scan via SQL FILTER;
// `recent` is one indexed query. No per-row queries (no N+1).
export async function getDashboardData(): Promise<DashboardData> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // postgres-js can't bind a JS Date inside a raw sql template; pass an ISO
  // string and cast to timestamptz.
  const startOfTodayIso = startOfToday.toISOString();

  const countsPromise = db
    .select({
      awaitingVerification: sql<number>`count(*) filter (where ${orders.paymentStatus} = 'awaiting_verification')::int`,
      toConfirm: sql<number>`count(*) filter (where ${orders.orderStatus} = 'pending')::int`,
      toShip: sql<number>`count(*) filter (where ${orders.orderStatus} = 'confirmed')::int`,
      todayCount: sql<number>`count(*) filter (where ${orders.createdAt} >= ${startOfTodayIso}::timestamptz)::int`,
    })
    .from(orders);

  const recentPromise = db
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
    .orderBy(desc(orders.createdAt))
    .limit(10);

  const [counts, recent] = await Promise.all([countsPromise, recentPromise]);
  const c = counts[0];

  return {
    awaitingVerification: c?.awaitingVerification ?? 0,
    toConfirm: c?.toConfirm ?? 0,
    toShip: c?.toShip ?? 0,
    todayCount: c?.todayCount ?? 0,
    recent,
  };
}
