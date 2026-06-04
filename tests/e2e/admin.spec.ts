import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PASSWORD = "password123";
const PNG = new URL("./../fixtures/payment.png", import.meta.url).pathname;

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account$/);
}

async function login(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(/\/account$/);
}

// Register → grant admin via the owner script → re-auth so the JWT carries the
// admin role (register leaves a stale role=user session; must log out first).
async function makeAdmin(page: Page, email: string): Promise<void> {
  await register(page, email);
  execFileSync("pnpm", ["grant-admin", email], { stdio: "ignore" });
  await page.goto("/account");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/$/);
  await login(page, email);
}

// Click a status/payment action button and confirm the new badge value
// persisted. The button calls a Server Action then router.refresh(); rather
// than depend on that client repaint, we wait for the action's POST to commit,
// then reload to read the authoritative server-rendered badge.
async function clickAction(
  page: Page,
  name: string,
  testId: string,
  expected: string,
): Promise<void> {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeEnabled(); // hydrated + actionable
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
    button.click(),
  ]);
  await page.reload();
  await expect(page.getByTestId(testId)).toHaveText(expected);
}

async function fillShipping(page: Page): Promise<void> {
  for (const [label, value] of [
    ["Full name", "Admin Buyer"],
    ["Phone", "01700000123"],
    ["Address", "1 Rd"],
    ["Area / thana", "Gulshan"],
    ["City / district", "Dhaka"],
  ] as const) {
    await page.getByLabel(label).fill(value);
  }
}

async function addToCart(page: Page): Promise<void> {
  await page.goto("/products/compression-top");
  await page.getByRole("button", { name: "S", exact: true }).click();
  // The add is a Server Action (optimistic badge first, then the DB write +
  // Set-Cookie land in the POST response). Wait for that POST so the cart — and
  // its cookie — are committed before we navigate to checkout, which server-
  // reads the cart by cookie. The optimistic badge alone races that write.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
    page.getByRole("button", { name: "Add to cart" }).click(),
  ]);
  await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
}

// Open /checkout and make sure the cart is present (shipping form rendered). If
// the server read raced the cart write, reload once — the cookie is set, so a
// fresh read resolves it.
async function gotoCheckoutWithCart(page: Page): Promise<void> {
  await page.goto("/checkout");
  const fullName = page.getByLabel("Full name");
  if (!(await fullName.isVisible().catch(() => false))) {
    await page.reload();
  }
  await expect(fullName).toBeVisible();
}

// Returns the new order's admin detail URL (derived from the receipt token via
// the admin list is overkill; the order id is the latest, so open via the list).
async function placeCod(page: Page): Promise<void> {
  await addToCart(page);
  await gotoCheckoutWithCart(page);
  await fillShipping(page);
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/);
}

async function placeBkash(page: Page): Promise<void> {
  await addToCart(page);
  await gotoCheckoutWithCart(page);
  await fillShipping(page);
  await page.getByText("bKash / Nagad", { exact: true }).click();
  await page.getByLabel("TrxID").fill("ADMINFLOW1");
  await page.getByLabel("Payment screenshot").setInputFiles(PNG);
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/);
}

// Open the most recent order's admin detail page. The dashboard "Recent orders"
// list is ordered by createdAt desc, so its first row is the just-placed order
// (the orders list uses actionable-first ordering, which isn't recency).
async function openLatestOrder(page: Page): Promise<void> {
  await page.goto("/admin/orders");
  // Per-test reseed leaves exactly the one order just placed; open it by its
  // row link (accessible name "Open order N") rather than a bare-number match
  // that could collide with dashboard stat numbers. Navigate via the href
  // directly — clicking the stretched-link row can race hydration of the SPA
  // navigation, leaving us on /admin/orders.
  const rowLink = page.getByRole("link", { name: /^Open order \d+$/ }).first();
  await expect(rowLink).toBeVisible();
  const href = await rowLink.getAttribute("href");
  await page.goto(href ?? "/admin/orders");
  await page.waitForURL(/\/admin\/orders\/\d+$/);
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

  test("admin reaches the dashboard and orders list", async ({ page }) => {
    await makeAdmin(page, `admin-${Date.now()}@aucto.test`);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  });

  test("screenshot route denies a non-admin (403)", async ({ page }) => {
    const res = await page.goto("/api/admin/screenshot/deadbeefdeadbeefdeadbeefdeadbeef.png");
    expect(res?.status()).toBe(403);
  });
});

test.describe("admin order management", () => {
  test("whole row is an accessible link (keyboard + new-tab)", async ({ page, context }) => {
    await makeAdmin(page, `admin-row-${Date.now()}@aucto.test`);
    await placeCod(page);
    await page.goto("/admin/orders");

    const rowLink = page.getByRole("link", { name: /^Open order \d+$/ }).first();
    await expect(rowLink).toBeVisible();
    // It's a real anchor with an order href (native semantics, not a JS-only
    // row onClick) — that's what makes keyboard nav + new-tab work.
    const href = await rowLink.getAttribute("href");
    expect(href).toMatch(/\/admin\/orders\/\d+$/);

    // cmd/ctrl-click opens a new tab to that href (native anchor behavior).
    // Assert on the new tab's TARGET url (the page event carries it), then bring
    // it to front so it isn't a throttled background tab, and let it settle.
    // Background tabs in headless Chromium can stall on "load", so we don't gate
    // the assertion on a full load.
    const popupPromise = context.waitForEvent("page");
    await rowLink.click({ modifiers: ["ControlOrMeta"] });
    const popup = await popupPromise;
    await popup.bringToFront();
    await expect.poll(() => new URL(popup.url()).pathname).toMatch(/\/admin\/orders\/\d+$/);
    await popup.close();
    // popup.bringToFront() backgrounded this page; re-foreground it so its SPA
    // navigation isn't throttled (a backgrounded tab stalls the transition).
    await page.bringToFront();

    // Normal click navigates in place. Arm the navigation wait BEFORE clicking
    // so a fast SPA transition can't complete before we start listening; use the
    // domcontentloaded gate (the detail page's "load" can stall on images).
    await Promise.all([
      page.waitForURL(/\/admin\/orders\/\d+$/, { waitUntil: "domcontentloaded" }),
      rowLink.click(),
    ]);
  });

  test("MFS: mark paid → payment paid", async ({ page }) => {
    await makeAdmin(page, `admin-paid-${Date.now()}@aucto.test`);
    await placeBkash(page);
    await openLatestOrder(page);

    // Screenshot served via the gated route returns 200.
    const img = page.getByAltText(/Payment screenshot/);
    const src = await img.getAttribute("src");
    expect((await page.request.get(src ?? "")).status()).toBe(200);

    await clickAction(page, "Mark paid", "payment-status", "paid");
  });

  test("MFS: reject → cancelled + rejected", async ({ page }) => {
    await makeAdmin(page, `admin-rej-${Date.now()}@aucto.test`);
    await placeBkash(page);
    await openLatestOrder(page);

    await clickAction(page, "Reject payment", "payment-status", "rejected");
    await expect(page.getByTestId("order-status")).toHaveText("cancelled");
  });

  test("COD: confirm → ship → deliver → mark paid", async ({ page }) => {
    await makeAdmin(page, `admin-cod-${Date.now()}@aucto.test`);
    await placeCod(page);
    await openLatestOrder(page);

    // A pending order must NOT offer "Mark delivered" (invalid transition).
    await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);

    await clickAction(page, "Confirm order", "order-status", "confirmed");
    await clickAction(page, "Mark shipped", "order-status", "shipped");
    await clickAction(page, "Mark delivered", "order-status", "delivered");
    await clickAction(page, "Mark COD paid", "payment-status", "paid");
  });
});
