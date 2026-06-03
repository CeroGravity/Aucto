"use client";

import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ShippingInput } from "@/lib/checkout";
import { cn } from "@/lib/utils";
import { placeManualOrder } from "@/server/actions/order";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Method = "cod" | "mfs";
type Mfs = "bkash" | "nagad";

const shippingFields: Array<{
  name: keyof ShippingInput;
  label: string;
  autoComplete?: string;
}> = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  { name: "phone", label: "Phone", autoComplete: "tel" },
  { name: "address", label: "Address", autoComplete: "street-address" },
  { name: "area", label: "Area / thana", autoComplete: "address-level2" },
  { name: "city", label: "City / district", autoComplete: "address-level1" },
  { name: "postcode", label: "Postcode (optional)", autoComplete: "postal-code" },
];

export function CheckoutForm({
  defaultValues,
  amountLabel,
  bkashNumber,
  nagadNumber,
}: {
  defaultValues: Partial<ShippingInput>;
  amountLabel: string;
  bkashNumber: string;
  nagadNumber: string;
}) {
  const [method, setMethod] = useState<Method>("cod");
  const [mfs, setMfs] = useState<Mfs>("bkash");
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const groupId = useId();

  const mfsNumber = mfs === "bkash" ? bkashNumber : nagadNumber;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("method", method === "cod" ? "cod" : mfs);
    startTransition(async () => {
      const result = await placeManualOrder(formData);
      if (result.ok) {
        window.location.href = `/order/${result.accessToken}`;
      } else {
        setFormError(result.error);
      }
    });
  }

  const methodBtn = (active: boolean) =>
    cn(
      "flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border hover:border-foreground/50",
    );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-4">
        {shippingFields.map((field) => (
          <div key={field.name} className="flex flex-col gap-2">
            <label htmlFor={field.name} className="font-medium text-sm">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type="text"
              autoComplete={field.autoComplete}
              defaultValue={defaultValues[field.name] ?? ""}
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-medium text-sm">Payment method</legend>
        {/* Radiogroup: arrow-key navigable via the radio inputs (visually a
            segmented toggle). */}
        <div role="radiogroup" aria-label="Payment method" className="flex gap-2">
          <label className={methodBtn(method === "cod")}>
            <input
              type="radio"
              name={`${groupId}-method`}
              className="sr-only"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
            />
            Cash on Delivery
          </label>
          <label className={methodBtn(method === "mfs")}>
            <input
              type="radio"
              name={`${groupId}-method`}
              className="sr-only"
              checked={method === "mfs"}
              onChange={() => setMethod("mfs")}
            />
            bKash / Nagad
          </label>
        </div>
      </fieldset>

      {method === "mfs" ? (
        <div className="flex flex-col gap-4 rounded-md border border-border p-4">
          <div role="radiogroup" aria-label="Mobile wallet" className="flex gap-2">
            {(["bkash", "nagad"] as const).map((m) => (
              <label key={m} className={methodBtn(mfs === m)}>
                <input
                  type="radio"
                  name={`${groupId}-mfs`}
                  className="sr-only"
                  checked={mfs === m}
                  onChange={() => setMfs(m)}
                />
                {m === "bkash" ? "bKash" : "Nagad"}
              </label>
            ))}
          </div>

          <p className="text-sm">
            Send <span className="font-semibold">{amountLabel}</span> to{" "}
            <span className="font-semibold">{mfsNumber || "(number unavailable)"}</span> (
            {mfs === "bkash" ? "bKash" : "Nagad"}), then enter your TrxID below.
          </p>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="trxId" className="font-medium text-sm">
                TrxID
              </label>
              <details className="group relative">
                <summary className="cursor-pointer list-none text-muted-foreground text-xs underline-offset-4 hover:underline">
                  How do I find my TrxID?
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground text-xs shadow-md">
                  After paying, bKash/Nagad send a confirmation SMS and log the transaction in their
                  app. The TrxID is a ~10-character code (letters + digits, e.g. ABC1D2E3F4) in that
                  SMS or your transaction history.
                </div>
              </details>
            </div>
            <input
              id="trxId"
              name="trxId"
              type="text"
              autoComplete="off"
              className={inputClass}
              placeholder="e.g. ABC1D2E3F4"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="screenshot" className="font-medium text-sm">
              Payment screenshot
            </label>
            <input
              id="screenshot"
              name="screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:font-medium file:text-secondary-foreground file:text-sm"
            />
            <p className="text-muted-foreground text-xs">JPEG, PNG, or WebP — max 5MB.</p>
          </div>
        </div>
      ) : null}

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </form>
  );
}
