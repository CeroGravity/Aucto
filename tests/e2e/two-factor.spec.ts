import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import * as OTPAuth from "otpauth";

import { twoFactorBackupCodes, users } from "../../src/lib/db/schema";
import { db, expect, test } from "./fixtures";

function uniqueEmail(): string {
  return `tfa-${Date.now()}-${Math.floor(Math.random() * 1e6)}@aucto.test`;
}

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByLabel("Phone").fill("01700000000");
  await Promise.all([
    page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);
}

// Compute the current 6-digit TOTP for a base32 secret using the SAME lib/params
// the app uses (SHA1/6/30) — these are REAL codes, not a bypass.
function totpNow(secretBase32: string): string {
  return new OTPAuth.TOTP({
    issuer: "Aucto",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  }).generate();
}

// Generate a TOTP code that will stay valid through the network round-trip. If
// we're within 3s of a 30s step boundary, wait past it first — otherwise the
// code can roll over between fill and server-side validation. (The app's ±1 step
// window tolerates real drift; this just removes test-side boundary flake.)
async function freshTotp(secretBase32: string): Promise<string> {
  const intoStep = (Date.now() / 1000) % 30;
  if (intoStep > 27) await new Promise((r) => setTimeout(r, (30 - intoStep + 0.3) * 1000));
  return totpNow(secretBase32);
}

// Start enrollment in account security and return the manual secret shown in the
// UI (the same secret encoded in the QR).
async function startEnroll(page: Page): Promise<string> {
  await page.goto("/account");
  await page.getByRole("button", { name: "Set up two-factor" }).click();
  const secretEl = page.locator("code").first();
  await expect(secretEl).toBeVisible();
  const secret = (await secretEl.textContent())?.trim() ?? "";
  expect(secret.length).toBeGreaterThan(0);
  return secret;
}

// Full enroll → confirm with a valid code → returns the shown backup codes.
async function enrollAndEnable(page: Page): Promise<{ secret: string; backupCodes: string[] }> {
  const secret = await startEnroll(page);
  await page.getByLabel("Verification code").fill(await freshTotp(secret));
  await page.getByRole("button", { name: "Confirm & enable" }).click();
  await expect(page.getByText(/Save these backup codes/i)).toBeVisible();
  const items = page.locator("ul.font-mono li");
  const backupCodes = (await items.allTextContents()).map((c) => c.trim()).filter(Boolean);
  expect(backupCodes.length).toBeGreaterThanOrEqual(8);
  await page.getByRole("button", { name: "I’ve saved them" }).click();
  return { secret, backupCodes };
}

async function logout(page: Page): Promise<void> {
  await page.goto("/account");
  await Promise.all([
    page.waitForURL(/\/$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Log out" }).click(),
  ]);
}

async function loginPassword(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Log in" }).click();
}

test.describe("two-factor (TOTP)", () => {
  test("enroll → confirm with a valid code enables 2FA; secret is encrypted at rest", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await register(page, email);
    const { secret } = await enrollAndEnable(page);

    // Enabled: the section now shows the disable form.
    await page.goto("/account");
    await expect(page.getByRole("button", { name: "Disable two-factor" })).toBeVisible();

    // Ciphertext at rest: the stored value must NOT be the base32 secret.
    const row = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { totpSecretEnc: true, totpEnabled: true },
    });
    expect(row?.totpEnabled).toBe(true);
    expect(row?.totpSecretEnc).toBeTruthy();
    expect(row?.totpSecretEnc).not.toBe(secret);
    expect(row?.totpSecretEnc).not.toContain(secret);
  });

  test("a wrong confirm code does NOT enable 2FA", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    await startEnroll(page);
    await page.getByLabel("Verification code").fill("000000");
    await page.getByRole("button", { name: "Confirm & enable" }).click();
    await expect(page.getByText(/didn’t match/i)).toBeVisible();

    const row = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { totpEnabled: true },
    });
    expect(row?.totpEnabled).toBe(false);
  });

  test("login requires a valid TOTP; a wrong code yields no session", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    const { secret } = await enrollAndEnable(page);
    await logout(page);

    // Password alone → code field is revealed, NOT a session.
    await loginPassword(page, email);
    await expect(page.getByLabel("Authentication code")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Wrong code → still no session.
    await page.getByLabel("Authentication code").fill("000000");
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(page.getByText(/Invalid code/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);

    // Valid TOTP → session.
    await page.getByLabel("Authentication code").fill(await freshTotp(secret));
    await Promise.all([
      page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Verify code" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  });

  test("a backup code logs in once; reusing it is rejected", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    const { backupCodes } = await enrollAndEnable(page);
    const code = backupCodes[0];
    expect(code).toBeTruthy();
    await logout(page);

    // First use → session.
    await loginPassword(page, email);
    await expect(page.getByLabel("Authentication code")).toBeVisible();
    await page.getByLabel("Authentication code").fill(code as string);
    await Promise.all([
      page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Verify code" }).click(),
    ]);
    await logout(page);

    // Reuse → rejected (one-time).
    await loginPassword(page, email);
    await page.getByLabel("Authentication code").fill(code as string);
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(page.getByText(/Invalid code/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("too many wrong codes lock the 2FA step", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    const { secret } = await enrollAndEnable(page);
    await logout(page);

    await loginPassword(page, email);
    await expect(page.getByLabel("Authentication code")).toBeVisible();

    // 5 wrong codes → lock (MAX_FAILURES = 5).
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Authentication code").fill("000000");
      await page.getByRole("button", { name: "Verify code" }).click();
      await expect(page.getByText(/Invalid code|Too many attempts/i)).toBeVisible();
    }
    await expect(page.getByText(/Too many attempts/i)).toBeVisible();

    // Even a VALID code is refused while locked.
    await page.getByLabel("Authentication code").fill(totpNow(secret));
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(page.getByText(/Too many attempts/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("OAuth-only account sees the Google-2FA message, not the enroll flow", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    // Simulate an OAuth-only account (Google sign-ups have no passwordHash). The
    // account UI gates enrollment on a passwordHash, so the enroll flow hides and
    // the Google-2FA message shows.
    await db.update(users).set({ passwordHash: null }).where(eq(users.email, email));

    await page.goto("/account");
    await expect(page.getByText(/signs in with Google/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Set up two-factor" })).toHaveCount(0);
  });

  test("disable with a valid code clears the secret + backup codes; login then needs no code", async ({
    page,
  }) => {
    const email = uniqueEmail();
    await register(page, email);
    const { secret } = await enrollAndEnable(page);

    // Disable with a current code.
    await page.goto("/account");
    await page.getByLabel("Enter a current code to turn it off").fill(await freshTotp(secret));
    await page.getByRole("button", { name: "Disable two-factor" }).click();

    // The UI reflects the disable (section returns to the enroll button). Gate on
    // this first — it confirms the server action resolved — before reading the DB
    // through the shared test client (which can starve mid-action under load).
    await expect(page.getByRole("button", { name: "Set up two-factor" })).toBeVisible({
      timeout: 15_000,
    });

    // DB cleared (authoritative).
    await expect
      .poll(
        async () => {
          const r = await db.query.users.findFirst({
            where: eq(users.email, email),
            columns: { totpEnabled: true },
          });
          return r?.totpEnabled;
        },
        { timeout: 15_000 },
      )
      .toBe(false);
    const row = await db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, totpSecretEnc: true },
    });
    expect(row?.totpSecretEnc).toBeNull();
    // This user's backup codes are gone (scoped — the table isn't reseeded, so
    // other tests' codes coexist).
    const codes = await db.query.twoFactorBackupCodes.findMany({
      where: eq(twoFactorBackupCodes.userId, row?.id ?? ""),
    });
    expect(codes.length).toBe(0);

    // Login no longer asks for a code.
    await logout(page);
    await loginPassword(page, email);
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByLabel("Authentication code")).toHaveCount(0);
  });
});
