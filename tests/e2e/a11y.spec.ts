import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PASSWORD = "password123";

// Fail only on serious/critical violations (WCAG 2.1 A/AA tags). Returns the
// offending violations so the assertion message names them.
async function scan(page: Page, context?: string) {
  // Wait for the document title to settle (App Router sets it after hydration);
  // scanning mid-stream can momentarily see an empty <title> (document-title).
  await page.waitForFunction(() => document.title.trim().length > 0).catch(() => {});
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
  await Promise.all([
    page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);
}

async function makeAdmin(page: Page, email: string): Promise<void> {
  await register(page, email);
  execFileSync("pnpm", ["grant-admin", email], { stdio: "ignore" });
  await page.goto("/account");
  await Promise.all([
    page.waitForURL(/\/$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Log out" }).click(),
  ]);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Log in" }).click(),
  ]);
}

async function placeOrder(page: Page): Promise<string> {
  await page.goto("/products/compression-top");
  // Wait for the size control to hydrate before interacting (a pre-hydration
  // click is a no-op → empty cart). Select S, add, wait for the add POST.
  const size = page.getByRole("button", { name: "S", exact: true });
  await expect(size).toBeEnabled();
  await size.click();
  const add = page.getByRole("button", { name: "Add to cart" });
  await expect(add).toBeEnabled();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
    add.click(),
  ]);
  // Confirm the add committed (optimistic badge + server write) before leaving.
  await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

  // Reach checkout with the cart present; if the server read raced the write,
  // reload until the shipping form renders (the cookie is set, a fresh read
  // resolves it).
  await page.goto("/checkout");
  await expect(async () => {
    if (
      !(await page
        .getByLabel("Full name")
        .isVisible()
        .catch(() => false))
    ) {
      await page.reload();
    }
    await expect(page.getByLabel("Full name")).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 20000 });
  await page.getByLabel("Full name").fill("A11y Buyer");
  await page.getByLabel("Phone").fill("01700000000");
  await page.getByLabel("Address").fill("1 Test Rd");
  await page.getByLabel("Area / thana").fill("Gulshan");
  await page.getByLabel("City / district").fill("Dhaka");
  await Promise.all([
    page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/, { waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Place order" }).click(),
  ]);
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

    // A product edit page (forms + image manager + status actions). Use the
    // domcontentloaded gate — the edit page's "load" can stall on image
    // subresources, and the scan waits for readiness itself.
    await Promise.all([
      page.waitForURL(/\/admin\/products\/\d+$/, { waitUntil: "domcontentloaded" }),
      page
        .getByRole("link", { name: /Compression Top/i })
        .first()
        .click(),
    ]);
    await scan(page, "admin product edit");
  });
});
