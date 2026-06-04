import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PASSWORD = "password123";

// Fail only on serious/critical violations (WCAG 2.1 A/AA tags). Returns the
// offending violations so the assertion message names them.
async function scan(page: Page, context?: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  const summary = serious.map((v) => `${v.id} (${v.impact}) [${v.nodes.length}]`).join(", ");
  expect(serious, `${context ?? page.url()} — ${summary}`).toEqual([]);
}

// Render the page in dark theme: next-themes reads localStorage "theme" + the
// .dark class on <html>. Seed it before any navigation in the test.
async function useDarkTheme(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("theme", "dark");
    } catch {}
  });
}

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account$/);
}

async function makeAdmin(page: Page, email: string): Promise<void> {
  await register(page, email);
  execFileSync("pnpm", ["grant-admin", email], { stdio: "ignore" });
  await page.goto("/account");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/$/);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/account$/);
}

async function placeOrder(page: Page): Promise<string> {
  await page.goto("/products/compression-top");
  await page.getByRole("button", { name: "S", exact: true }).click();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
    page.getByRole("button", { name: "Add to cart" }).click(),
  ]);
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("A11y Buyer");
  await page.getByLabel("Phone").fill("01700000000");
  await page.getByLabel("Address").fill("1 Test Rd");
  await page.getByLabel("Area / thana").fill("Gulshan");
  await page.getByLabel("City / district").fill("Dhaka");
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/);
  return page.url();
}

const STOREFRONT: Array<{ name: string; path: string }> = [
  { name: "home", path: "/" },
  { name: "catalog", path: "/products" },
  { name: "PDP", path: "/products/compression-top" },
  { name: "cart", path: "/cart" },
  { name: "checkout", path: "/checkout" },
  { name: "login", path: "/login" },
  { name: "register", path: "/register" },
];

test.describe("a11y — storefront (light)", () => {
  for (const { name, path } of STOREFRONT) {
    test(`${name} has no serious/critical axe violations`, async ({ page }) => {
      await page.goto(path);
      await scan(page, `${name} (light)`);
    });
  }
});

test.describe("a11y — storefront (dark)", () => {
  for (const { name, path } of STOREFRONT) {
    test(`${name} (dark) has no serious/critical axe violations`, async ({ page }) => {
      await useDarkTheme(page);
      await page.goto(path);
      await scan(page, `${name} (dark)`);
    });
  }
});

test.describe("a11y — account + receipt", () => {
  test("account page is clean", async ({ page }) => {
    await register(page, `a11y-acct-${Date.now()}@aucto.test`);
    await scan(page, "account");
  });

  test("order receipt is clean", async ({ page }) => {
    const url = await placeOrder(page);
    await page.goto(url);
    await scan(page, "order receipt");
  });
});

test.describe("a11y — admin", () => {
  test("dashboard, orders, order detail, products are clean", async ({ page }) => {
    await makeAdmin(page, `a11y-admin-${Date.now()}@aucto.test`);

    await page.goto("/admin");
    await scan(page, "admin dashboard");

    await page.goto("/admin/orders");
    await scan(page, "admin orders");

    await page.goto("/admin/products");
    await scan(page, "admin products");

    // A product edit page (forms + image manager + status actions).
    await page
      .getByRole("link", { name: /Compression Top/i })
      .first()
      .click();
    await page.waitForURL(/\/admin\/products\/\d+$/);
    await scan(page, "admin product edit");
  });
});
