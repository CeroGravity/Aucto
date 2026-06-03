import { cn } from "@/lib/utils";

type Step = { label: string; at: Date | null; done: boolean };

function fmt(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Status timeline built from the order's lifecycle timestamps. Cancelled orders
// show a cancelled marker instead of the fulfilment chain tail.
export function OrderTimeline({
  createdAt,
  confirmedAt,
  shippedAt,
  deliveredAt,
  cancelledAt,
}: {
  createdAt: Date;
  confirmedAt: Date | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
}) {
  const steps: Step[] = [
    { label: "Placed", at: createdAt, done: true },
    { label: "Confirmed", at: confirmedAt, done: confirmedAt !== null },
    { label: "Shipped", at: shippedAt, done: shippedAt !== null },
    { label: "Delivered", at: deliveredAt, done: deliveredAt !== null },
    ...(cancelledAt ? [{ label: "Cancelled", at: cancelledAt, done: true }] : []),
  ];

  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step) => (
        <li key={step.label} className="flex items-start gap-3">
          <span
            className={cn(
              "mt-1 size-2.5 shrink-0 rounded-full",
              step.label === "Cancelled" ? "bg-destructive" : step.done ? "bg-primary" : "bg-muted",
            )}
            aria-hidden
          />
          <div className="flex flex-col">
            <span
              className={cn(
                "font-medium text-sm",
                step.done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
            {step.at ? (
              <span className="text-muted-foreground text-xs">{fmt(step.at)}</span>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
