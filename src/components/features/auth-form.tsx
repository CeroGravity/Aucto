"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { OAuthButtons } from "@/components/features/oauth-buttons";
import { Button } from "@/components/ui/button";
import type { AuthResult } from "@/server/actions/auth";

// Phone is required + validated only at registration (client-side hint; the
// server re-validates with the same BD rule). Login ignores it.
const baseShape = {
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
};
const loginSchema = z.object(baseShape);
const registerSchema = z.object({
  ...baseShape,
  phone: z
    .string()
    .trim()
    .regex(/^(?:\+?880|0)1[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number."),
});

type FormValues = { email: string; password: string; phone?: string };

type AuthFormProps = {
  mode: "login" | "register";
  // phone is "" for login; the server validates it on register. `code` carries
  // the 2FA code on the resubmit after the password step (login only).
  action: (email: string, password: string, phone: string, code?: string) => Promise<AuthResult>;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  // Revealed once the password is accepted but the account has 2FA enabled.
  const [twoFactor, setTwoFactor] = useState(false);
  const [code, setCode] = useState("");

  const isRegister = mode === "register";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(isRegister ? registerSchema : loginSchema) });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await action(
        values.email,
        values.password,
        values.phone ?? "",
        twoFactor ? code : undefined,
      );
      if (result.ok) {
        router.push("/account");
        router.refresh();
        return;
      }
      if ("twoFactorRequired" in result) {
        setTwoFactor(true);
        setFormError(result.error ?? null);
      } else {
        setFormError(result.error);
      }
    });
  });

  return (
    <div className="flex flex-col gap-5">
      <OAuthButtons />

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-muted-foreground text-xs uppercase tracking-wide">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="font-medium text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.email ? (
            <p className="text-destructive-text text-sm">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="font-medium text-sm">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            {...register("password")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {errors.password ? (
            <p className="text-destructive-text text-sm">{errors.password.message}</p>
          ) : null}
          {isRegister ? (
            <p className="text-muted-foreground text-xs">At least 8 characters.</p>
          ) : null}
        </div>

        {isRegister ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="font-medium text-sm">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              {...register("phone")}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.phone ? (
              <p className="text-destructive-text text-sm">{errors.phone.message}</p>
            ) : (
              <p className="text-muted-foreground text-xs">
                Bangladesh mobile — used for delivery (e.g. 01XXXXXXXXX).
              </p>
            )}
          </div>
        ) : null}

        {twoFactor ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="font-medium text-sm">
              Authentication code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-muted-foreground text-xs">
              Enter the 6-digit code from your authenticator app, or a backup code.
            </p>
          </div>
        ) : null}

        {formError ? (
          <p role="alert" className="text-destructive-text text-sm">
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : twoFactor
                ? "Verify code"
                : "Log in"}
        </Button>
      </form>

      <p className="text-center text-muted-foreground text-sm">
        {isRegister ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline underline-offset-4">
              Log in
            </Link>
          </>
        ) : (
          <>
            New to Aucto?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline underline-offset-4"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
