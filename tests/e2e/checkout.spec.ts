import { expect, type Page, test } from "@playwright/test";

async function addToCart(page: Page): Promise<void> {
  await page.goto("/products/compression-top");
  await page.getByRole("button", { name: "S", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  // Persist the (optimistic) add before the server reads the cart at checkout.
  await page.waitForLoadState("networkidle");
}

async function fillShipping(page: Page, fullName: string): Promise<void> {
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Phone").fill("01700000000");
  await page.getByLabel("Address").fill("123 Test Road");
  await page.getByLabel("Area / thana").fill("Gulshan");
  await page.getByLabel("City / district").fill("Dhaka");
}

test.describe("checkout", () => {
  test("guest checkout: initiate to return to confirmation (fake success)", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();

    await fillShipping(page, "Test Buyer");
    await page.getByRole("button", { name: "Place order" }).click();

    // Redirect → fake-return → token confirmation page.
    await page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: /confirmed/i })).toBeVisible();
    await expect(page.getByText(/Status:/)).toContainText(/paid/i);
    await expect(page.getByLabel("Cart, empty")).toBeVisible();
  });

  test("declined payment returns to checkout with an intact cart", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillShipping(page, "Test decline");
    await page.getByRole("button", { name: "Place order" }).click();

    await page.waitForURL(/\/checkout\?status=declined/);
    await expect(page.getByText(/Payment was declined/i)).toBeVisible();
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  });

  test("order page denies an unknown token (IDOR)", async ({ page }) => {
    await page.goto("/order/this-token-does-not-exist");
    // Not-found UI is shown; no order data leaks for a guessed token.
    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await expect(page.getByText(/Thank you/i)).toHaveCount(0);
    await expect(page.getByText(/Shipping to/i)).toHaveCount(0);
  });

  test("checkout redirects to /cart when the cart is empty", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForURL(/\/cart$/);
  });
});
