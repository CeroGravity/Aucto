import type { OrderLifecycle, PaymentStatusValue } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

// Token-based color coding (no hardcoded hex). Uses surface/muted + semantic
// foreground utilities so it themes light/dark.
const base = "inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs capitalize";

const ORDER_CLASS: Record<OrderLifecycle, string> = {
  pending: "bg-accent/15 text-accent",
  confirmed: "bg-primary/10 text-primary",
  shipped: "bg-primary/10 text-primary",
  delivered: "bg-foreground text-background",
  cancelled: "bg-muted text-muted-foreground line-through",
  returned: "bg-muted text-muted-foreground",
};

const PAYMENT_CLASS: Record<PaymentStatusValue, string> = {
  unpaid: "bg-muted text-muted-foreground",
  awaiting_verification: "bg-accent/15 text-accent",
  paid: "bg-foreground text-background",
  rejected: "bg-destructive/15 text-destructive",
};

export function OrderStatusBadge({ status }: { status: OrderLifecycle }) {
  return (
    <span data-testid="order-status" className={cn(base, ORDER_CLASS[status])}>
      {status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatusValue }) {
  return (
    <span data-testid="payment-status" className={cn(base, PAYMENT_CLASS[status])}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
