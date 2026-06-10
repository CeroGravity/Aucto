"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updatePhone } from "@/server/actions/auth";

// Account phone display + edit. Used by anyone (Google users add the phone the
// provider can't give; email/password users edit theirs). Server re-validates.
export function PhoneSettings({ phone }: { phone: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updatePhone(value);
      if (result.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label htmlFor="account-phone" className="font-medium text-sm">
        Phone
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="account-phone"
          type="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="h-10 w-56 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save phone"}
        </Button>
        {saved ? <span className="text-muted-foreground text-sm">Saved.</span> : null}
      </div>
      {error ? <p className="text-destructive-text text-sm">{error}</p> : null}
    </form>
  );
}
