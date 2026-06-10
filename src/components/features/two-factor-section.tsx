"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  confirmTwoFactorEnrollment,
  disableTwoFactor,
  startTwoFactorEnrollment,
} from "@/server/actions/two-factor";

const inputClass =
  "h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  // Whether 2FA is currently enabled, and whether this account can use it at all
  // (email/password only — OAuth-only accounts are gated out with a message).
  enabled: boolean;
  canEnroll: boolean;
};

type Enrollment = { secret: string; otpauthUri: string; qrDataUrl: string };

export function TwoFactorSection({ enabled, canEnroll }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState("");
  // Flip the view to "off" the moment disable succeeds, so we don't depend on
  // router.refresh()'s timing to re-read the `enabled` prop.
  const [locallyDisabled, setLocallyDisabled] = useState(false);
  const isEnabled = enabled && !locallyDisabled;

  if (!canEnroll) {
    return (
      <p className="text-muted-foreground text-sm">
        Your account signs in with Google, which manages two-factor authentication for you. There’s
        nothing to set up here.
      </p>
    );
  }

  // One-time backup codes screen (shown right after enabling).
  if (backupCodes) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-medium text-sm">
          Two-factor authentication is on. Save these backup codes.
        </p>
        <p className="text-muted-foreground text-sm">
          Each code works once. Use one if you lose access to your authenticator app. They won’t be
          shown again.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-md border border-border p-4 font-mono text-sm">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => {
            setBackupCodes(null);
            router.refresh();
          }}
        >
          I’ve saved them
        </Button>
      </div>
    );
  }

  if (isEnabled) {
    function onDisable(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setError(null);
      startTransition(async () => {
        const result = await disableTwoFactor({ code: disableCode });
        if (result.ok) {
          setDisableCode("");
          setLocallyDisabled(true);
          router.refresh();
        } else {
          setError(result.error);
        }
      });
    }
    return (
      <form onSubmit={onDisable} className="flex flex-col gap-3">
        <p className="text-sm">
          Two-factor authentication is <span className="font-medium">on</span>.
        </p>
        <label htmlFor="disable-code" className="font-medium text-sm">
          Enter a current code to turn it off
        </label>
        <input
          id="disable-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={disableCode}
          onChange={(e) => setDisableCode(e.target.value)}
          className={inputClass}
        />
        {error ? (
          <p role="alert" className="text-destructive-text text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" variant="outline" disabled={pending} className="w-fit">
          {pending ? "Disabling…" : "Disable two-factor"}
        </Button>
      </form>
    );
  }

  // Enrollment in progress: QR + manual key + confirm field.
  if (enrollment) {
    function onConfirm(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setError(null);
      startTransition(async () => {
        const result = await confirmTwoFactorEnrollment(confirmCode);
        if (result.ok) {
          setBackupCodes(result.backupCodes);
          setEnrollment(null);
          setConfirmCode("");
        } else {
          setError(result.error);
        }
      });
    }
    return (
      <form onSubmit={onConfirm} className="flex flex-col gap-3">
        <p className="text-sm">
          Scan this with your authenticator app (Google Authenticator, Authy, 1Password…), then
          enter the 6-digit code to finish.
        </p>
        <Image
          src={enrollment.qrDataUrl}
          alt="Two-factor QR code"
          width={220}
          height={220}
          unoptimized
          className="rounded-md border border-border bg-white p-2"
        />
        <p className="text-muted-foreground text-xs">
          Can’t scan? Enter this key manually:{" "}
          <code className="break-all font-mono text-foreground">{enrollment.secret}</code>
        </p>
        <label htmlFor="confirm-code" className="font-medium text-sm">
          Verification code
        </label>
        <input
          id="confirm-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={confirmCode}
          onChange={(e) => setConfirmCode(e.target.value)}
          className={inputClass}
        />
        {error ? (
          <p role="alert" className="text-destructive-text text-sm">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Verifying…" : "Confirm & enable"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-fit"
            onClick={() => {
              setEnrollment(null);
              setError(null);
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  // Default: off, offer to enroll.
  function onStart() {
    setError(null);
    startTransition(async () => {
      const result = await startTwoFactorEnrollment();
      if (result.ok) {
        setEnrollment({
          secret: result.secret,
          otpauthUri: result.otpauthUri,
          qrDataUrl: result.qrDataUrl,
        });
      } else {
        setError(result.error);
      }
    });
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">
        Add an extra step at login with an authenticator app. Free — no SMS.
      </p>
      {error ? (
        <p role="alert" className="text-destructive-text text-sm">
          {error}
        </p>
      ) : null}
      <Button variant="outline" className="w-fit" disabled={pending} onClick={onStart}>
        {pending ? "Preparing…" : "Set up two-factor"}
      </Button>
    </div>
  );
}
