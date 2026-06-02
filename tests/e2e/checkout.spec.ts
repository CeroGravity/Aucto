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
  test("guest can checkout and place an order (fake success)", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();

    await fillShipping(page, "Test Buyer");
    await page.getByRole("button", { name: "Place order" }).click();

    await page.waitForURL(/\/order\/\d+$/);
    await expect(page.getByRole("heading", { level: 1, name: /confirmed/i })).toBeVisible();
    await expect(page.getByText(/Status:/)).toContainText(/paid/i);

    // Cart cleared after a successful order.
    await expect(page.getByLabel("Cart, empty")).toBeVisible();
  });

  test("declined payment leaves no order and an intact cart", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");

    // Sentinel name forces the fake adapter to decline.
    await fillShipping(page, "Test decline");
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText(/Payment was declined/i)).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  });

  test("checkout redirects to /cart when the cart is empty", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForURL(/\/cart$/);
  });
});
