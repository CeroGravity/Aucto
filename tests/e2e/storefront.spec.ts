import { expect, test } from "./fixtures";

test.describe("storefront — nav + hero CTA", () => {
  test("header nav shows the 3 category items; no Shop All", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link", { name: "Compression", exact: true })).toHaveAttribute(
      "href",
      "/products?category=compression-shirts",
    );
    await expect(nav.getByRole("link", { name: "Shorts", exact: true })).toHaveAttribute(
      "href",
      "/products?category=mma-shorts",
    );
    await expect(nav.getByRole("link", { name: "Accessories", exact: true })).toHaveAttribute(
      "href",
      "/products?category=accessories",
    );
    // "Shop All" was removed from the nav.
    await expect(nav.getByRole("link", { name: "Shop All" })).toHaveCount(0);
  });

  test("home is the hero only; the Shop now CTA goes to all products", async ({ page }) => {
    await page.goto("/");
    // The Recommended section was removed.
    await expect(page.getByRole("heading", { name: "Recommended" })).toHaveCount(0);
    // The hero CTA takes the user to the catalog.
    const cta = page.getByRole("link", { name: "Shop now" });
    await expect(cta).toHaveAttribute("href", "/products");
    await Promise.all([
      page.waitForURL(/\/products$/, { waitUntil: "domcontentloaded" }),
      cta.click(),
    ]);
  });
});

test.describe("storefront — cart drawer closes on checkout", () => {
  test("clicking Checkout in the drawer closes it and lands on /checkout", async ({ page }) => {
    // Add an item → the drawer opens. Wait for the add POST (the cart Set-Cookie
    // commits) so the checkout server-read sees the cart.
    await page.goto("/products/compression-top");
    await page.getByRole("button", { name: "S", exact: true }).click();
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      page.getByRole("button", { name: "Add to cart" }).click(),
    ]);
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

    const drawer = page.locator('[role="dialog"][data-state="open"]').first();
    await expect(drawer).toBeVisible();

    // Click Checkout inside the drawer → it closes + we navigate to /checkout.
    await Promise.all([
      page.waitForURL(/\/checkout$/, { waitUntil: "domcontentloaded" }),
      drawer.getByRole("link", { name: "Checkout" }).click(),
    ]);

    // The drawer is gone, and we're on the checkout page (shipping form visible).
    await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(0);
    await expect(page.getByLabel("Full name")).toBeVisible();
  });
});
