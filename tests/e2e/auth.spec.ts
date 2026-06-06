import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

function uniqueEmail(): string {
  return `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}@aucto.test`;
}

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await Promise.all([
    page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);
}

test.describe("auth", () => {
  test("login + register show accessible OAuth buttons", async ({ page }) => {
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      const google = page.getByRole("button", { name: "Continue with Google" });
      const facebook = page.getByRole("button", { name: "Continue with Facebook" });
      await expect(google).toBeVisible();
      await expect(facebook).toBeVisible();
      // Real, keyboard-focusable buttons (not baked-in images).
      await google.focus();
      await expect(google).toBeFocused();
    }
  });

  test("register logs in and shows the account page", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);

    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("No orders yet.")).toBeVisible();
  });

  test("/account redirects to /login when logged out", async ({ page }) => {
    await page.goto("/account");
    // The middleware sends logged-out users to /login (with a callbackUrl).
    await page.waitForURL(/\/login(\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Log in" })).toBeVisible();
  });

  test("logout returns to a logged-out state", async ({ page }) => {
    await register(page, uniqueEmail());
    await Promise.all([
      page.waitForURL(/\/$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Log out" }).click(),
    ]);

    // Protected route now redirects again.
    await page.goto("/account");
    await page.waitForURL(/\/login(\?|$)/);
  });

  test("login works after registering", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);
    await Promise.all([
      page.waitForURL(/\/$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Log out" }).click(),
    ]);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await Promise.all([
      page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Log in" }).click(),
    ]);
    await expect(page.getByText(email)).toBeVisible();
  });

  test("guest cart merges into the account on register", async ({ page }) => {
    // Add an item as a guest.
    await page.goto("/products/compression-top");
    await page.getByRole("button", { name: "S", exact: true }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

    // Let the add persist server-side before registering (the badge is
    // optimistic; the guest cart must exist for the merge to find it).
    await page.waitForLoadState("networkidle");

    // Register — the guest cart should follow into the account.
    await register(page, uniqueEmail());
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  });
});
