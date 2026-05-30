import { expect, test } from "@playwright/test";

// Product cards link to /products/<slug>; filter chips link to /products?category=...
// so this selector matches only product cards.
const productCards = 'a[href^="/products/"]';

test.describe("catalog", () => {
  test("lists seeded products", async ({ page }) => {
    await page.goto("/products");

    await expect(page.getByRole("heading", { level: 1, name: "Shop all" })).toBeVisible();

    const cards = page.locator(productCards);
    expect(await cards.count()).toBeGreaterThanOrEqual(5);

    await expect(page.locator('a[href="/products/compression-top"]')).toBeVisible();
  });

  test("category filter narrows the grid", async ({ page }) => {
    await page.goto("/products");
    const allCount = await page.locator(productCards).count();

    // The filter control links to the shareable, URL-based filter.
    const filter = page.getByRole("navigation", { name: "Filter by category" });
    await expect(
      filter.getByRole("link", { name: "Muay Thai Shorts", exact: true }),
    ).toHaveAttribute("href", "/products?category=muay-thai-shorts");

    // Visiting that URL narrows the grid (server-rendered, shareable).
    await page.goto("/products?category=muay-thai-shorts");

    const filteredCount = await page.locator(productCards).count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(allCount);

    // A muay-thai product shows; a compression product does not.
    await expect(page.locator('a[href^="/products/muay-thai"]').first()).toBeVisible();
    await expect(page.locator('a[href="/products/compression-top"]')).toHaveCount(0);
  });

  test("product detail: size gates add-to-cart; out-of-stock size disabled", async ({ page }) => {
    await page.goto("/products");

    // Click a product → PDP loads.
    await page.locator('a[href="/products/compression-top"]').click();
    await expect(page).toHaveURL(/\/products\/compression-top$/);

    await expect(page.getByRole("heading", { level: 1, name: "Compression Top" })).toBeVisible();
    // ৳ price + size selector present.
    await expect(page.getByText(/৳/).first()).toBeVisible();
    await expect(page.getByText("Select size")).toBeVisible();

    // Add-to-cart starts disabled (no size selected).
    await expect(page.getByRole("button", { name: "Select a size" })).toBeDisabled();

    // Out-of-stock size (M = 0 for compression-top) is disabled.
    await expect(page.getByRole("button", { name: "M", exact: true })).toBeDisabled();

    // Selecting an in-stock size (S) enables add-to-cart.
    await page.getByRole("button", { name: "S", exact: true }).click();
    await expect(page.getByRole("button", { name: "Add to cart" })).toBeEnabled();
  });
});
