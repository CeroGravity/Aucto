import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

function uniqueEmail(): string {
  return `pw-${Date.now()}-${Math.floor(Math.random() * 1e6)}@aucto.test`;
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

test.describe("auth", () => {
  test("login + register show Google OAuth; Facebook removed", async ({ page }) => {
    for (const path of ["/login", "/register"]) {
      await page.goto(path);
      const google = page.getByRole("button", { name: "Continue with Google" });
      await expect(google).toBeVisible();
      // Facebook login was removed this phase — must be gone.
      await expect(page.getByRole("button", { name: "Continue with Facebook" })).toHaveCount(0);
      // Real, keyboard-focusable button (not a baked-in image).
      await google.focus();
      await expect(google).toBeFocused();
    }
  });

  test("register rejects a non-Bangladesh phone and accepts a valid one", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password").fill("password123");
    // Bad: too short / wrong country form — server + client both reject.
    await page.getByLabel("Phone").fill("12345");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/valid Bangladesh mobile number/i)).toBeVisible();
    // Still on /register (no account created).
    await expect(page).toHaveURL(/\/register$/);

    // Good: valid BD mobile — registration proceeds.
    await page.getByLabel("Phone").fill("01712345678");
    await Promise.all([
      page.waitForURL(/\/account$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Create account" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
  });

  test("account shows the phone and lets the user edit it", async ({ page }) => {
    await register(page, uniqueEmail());
    // Prefilled from registration.
    await expect(page.getByLabel("Phone")).toHaveValue("01700000000");

    await page.getByLabel("Phone").fill("01811112222");
    await page.getByRole("button", { name: "Save phone" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    // Persisted across a reload.
    await page.reload();
    await expect(page.getByLabel("Phone")).toHaveValue("01811112222");
  });

  test("checkout prefills the shipping phone from the account", async ({ page }) => {
    await register(page, uniqueEmail());

    await page.goto("/products/compression-top");
    await page.getByRole("button", { name: "S", exact: true }).click();
    // Wait for the add's Server Action POST to commit (DB write + Set-Cookie)
    // before navigating — the optimistic badge alone races that write.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

    await page.goto("/checkout");
    // Reload once if the cart cookie hasn't propagated to the checkout read yet.
    if (
      !(await page
        .getByLabel("Full name")
        .isVisible()
        .catch(() => false))
    )
      await page.reload();
    await expect(page.getByLabel("Phone")).toHaveValue("01700000000");
  });

  test("register logs in and shows the account page", async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email);

    await expect(page.getByRole("heading", { level: 1, name: "Account" })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("No orders yet.")).toBeVisible();
  });

  test("account order history lists the user's own order and links to its detail", async ({
    page,
  }) => {
    await register(page, uniqueEmail());

    // Place a COD order as the logged-in user.
    await page.goto("/products/compression-top");
    await page.getByRole("button", { name: "S", exact: true }).click();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

    // Reload once if the cart cookie hasn't propagated to the checkout read yet
    // (the form is absent → empty-cart state). Same guard the admin spec uses.
    await page.goto("/checkout");
    const fullName = page.getByLabel("Full name");
    if (!(await fullName.isVisible().catch(() => false))) await page.reload();
    await expect(fullName).toBeVisible();

    for (const [label, value] of [
      ["Full name", "Acct Buyer"],
      ["Phone", "01700000123"],
      ["Address", "1 Rd"],
      ["Area / thana", "Gulshan"],
      ["City / district", "Dhaka"],
    ] as const) {
      await page.getByLabel(label).fill(value);
    }
    await Promise.all([
      page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Place order" }).click(),
    ]);

    // Account now shows the order under history, linking to its own detail page.
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();
    const orderLink = page.getByRole("link", { name: /Order #\d+/ }).first();
    await expect(orderLink).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/, { waitUntil: "domcontentloaded" }),
      orderLink.click(),
    ]);
    await expect(page.getByText(/Order #\d+/).first()).toBeVisible();
  });

  test("account security section exposes change-password and a 2FA placeholder", async ({
    page,
  }) => {
    await register(page, uniqueEmail());
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: "Security" })).toBeVisible();
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(page.getByLabel("New password")).toBeVisible();
    // 2FA controls are a clearly-marked placeholder (disabled).
    await expect(page.getByRole("button", { name: /Set up 2FA/ })).toBeDisabled();
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
