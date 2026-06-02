"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { type ShippingInput, shippingSchema } from "@/lib/checkout";
import { placeOrder } from "@/server/actions/order";

const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Field = {
  name: keyof ShippingInput;
  label: string;
  autoComplete?: string;
  optional?: boolean;
};

const fields: Field[] = [
  { name: "fullName", label: "Full name", autoComplete: "name" },
  { name: "phone", label: "Phone", autoComplete: "tel" },
  { name: "address", label: "Address", autoComplete: "street-address" },
  { name: "area", label: "Area / thana", autoComplete: "address-level2" },
  { name: "city", label: "City / district", autoComplete: "address-level1" },
  {
    name: "postcode",
    label: "Postcode (optional)",
    autoComplete: "postal-code",
    optional: true,
  },
];

export function CheckoutForm({ defaultValues }: { defaultValues: Partial<ShippingInput> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ShippingInput>({
    resolver: zodResolver(shippingSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await placeOrder(values);
      if (result.ok) {
        router.push(`/order/${result.orderId}`);
        router.refresh();
      } else {
        setFormError(result.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-2">
          <label htmlFor={field.name} className="font-medium text-sm">
            {field.label}
          </label>
          <input
            id={field.name}
            type="text"
            autoComplete={field.autoComplete}
            {...register(field.name)}
            className={inputClass}
          />
          {errors[field.name] ? (
            <p className="text-destructive text-sm">{errors[field.name]?.message}</p>
          ) : null}
        </div>
      ))}

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
