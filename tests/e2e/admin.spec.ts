import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const PASSWORD = "password123";

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account$/);
}

test.describe("admin access control", () => {
  test("logged-out visitor is redirected from /admin to login", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForURL(/\/login/);
  });

  test("normal user gets not-found (no PII) on /admin", async ({ page }) => {
    await register(page, `user-${Date.now()}@aucto.test`);
    await page.goto("/admin/orders");
    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Orders" })).toHaveCount(0);
  });

  test("admin can reach the orders list", async ({ page }) => {
    const email = `admin-${Date.now()}@aucto.test`;
    await register(page, email);
    // Grant admin via the same script the owner runs, then re-auth so the JWT
    // carries the new role. Register leaves an active session, so log out first
    // (otherwise /login redirects straight back to /account with the old role).
    execFileSync("pnpm", ["grant-admin", email], { stdio: "ignore" });
    await page.goto("/account");
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL(/\/$/);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/account$/);

    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  });

  test("screenshot route denies a non-admin (403)", async ({ page }) => {
    const res = await page.goto("/api/admin/screenshot/deadbeefdeadbeefdeadbeefdeadbeef.png");
    expect(res?.status()).toBe(403);
  });
});
