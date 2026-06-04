"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { OrderLifecycle, PaymentStatusValue } from "@/lib/db/schema";
import {
  cancelOrder,
  confirmOrder,
  deliverOrder,
  markPaid,
  rejectPayment,
  shipOrder,
} from "@/server/actions/admin-orders";

type ActionResult = { ok: true } | { ok: false; error: string };
type Action = (id: number) => Promise<ActionResult>;

export function AdminOrderActions({
  orderId,
  orderStatus,
  paymentStatus,
}: {
  orderId: number;
  orderStatus: OrderLifecycle;
  paymentStatus: PaymentStatusValue;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: Action) {
    setError(null);
    startTransition(async () => {
      const result = await action(orderId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  const canConfirm = orderStatus === "pending";
  const canShip = orderStatus === "confirmed";
  const canDeliver = orderStatus === "shipped";
  const canCancel = orderStatus === "pending" || orderStatus === "confirmed";
  const canVerify = paymentStatus === "awaiting_verification";
  const canCodPaid = paymentStatus === "unpaid";

  const buttons: Array<{
    label: string;
    action: Action;
    show: boolean;
    variant?: "default" | "outline" | "destructive";
  }> = [
    { label: "Mark paid", action: markPaid, show: canVerify, variant: "default" },
    {
      label: "Reject payment",
      action: rejectPayment,
      show: canVerify,
      variant: "destructive",
    },
    { label: "Confirm order", action: confirmOrder, show: canConfirm },
    { label: "Mark shipped", action: shipOrder, show: canShip },
    { label: "Mark delivered", action: deliverOrder, show: canDeliver },
    {
      label: "Mark COD paid",
      action: markPaid,
      show: canCodPaid && !canVerify,
    },
    {
      label: "Cancel order",
      action: cancelOrder,
      show: canCancel,
      variant: "outline",
    },
  ];

  const visible = buttons.filter((b) => b.show);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">No further actions available.</p>
        ) : (
          visible.map((b) => (
            <Button
              key={b.label}
              type="button"
              variant={b.variant ?? "default"}
              disabled={pending}
              onClick={() => run(b.action)}
            >
              {b.label}
            </Button>
          ))
        )}
      </div>
      {error ? (
        <p role="alert" className="text-destructive-text text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
