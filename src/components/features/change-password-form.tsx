"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { changePassword } from "@/server/actions/auth";

const inputClass =
  "h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Change-password entry point. Collapsed by default; expands to a form that
// re-checks the current password server-side. OAuth-only users get a clear
// message from the action (no password to change).
export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    startTransition(async () => {
      const result = await changePassword(current, next);
      if (result.ok) {
        setDone(true);
        setCurrent("");
        setNext("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="current-password" className="font-medium text-sm">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => {
            setCurrent(e.target.value);
            setDone(false);
          }}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="new-password" className="font-medium text-sm">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => {
            setNext(e.target.value);
            setDone(false);
          }}
          className={inputClass}
        />
        <p className="text-muted-foreground text-xs">At least 8 characters.</p>
      </div>

      {error ? (
        <p role="alert" className="text-destructive-text text-sm">
          {error}
        </p>
      ) : null}
      {done ? <p className="text-muted-foreground text-sm">Password updated.</p> : null}

      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
