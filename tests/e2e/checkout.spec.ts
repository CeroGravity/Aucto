import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

const PNG = fileURLToPath(new URL("./../fixtures/payment.png", import.meta.url));
const TXT = fileURLToPath(new URL("./../fixtures/not-an-image.txt", import.meta.url));

async function addToCart(page: Page): Promise<void> {
  await page.goto("/products/compression-top");
  await page.getByRole("button", { name: "S", exact: true }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  // Persist the optimistic add before the server reads the cart at checkout.
  await page.waitForLoadState("networkidle");
}

async function fillShipping(page: Page, fullName = "Test Buyer"): Promise<void> {
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Phone").fill("01700000000");
  await page.getByLabel("Address").fill("123 Test Road");
  await page.getByLabel("Area / thana").fill("Gulshan");
  await page.getByLabel("City / district").fill("Dhaka");
}

test.describe("checkout", () => {
  test("COD: place order → receipt, pay on delivery, cart cleared", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillShipping(page);

    // Record the main-frame navigation sequence to assert there is NO
    // intermediate /cart hop (the empty-cart flash) between checkout and the
    // receipt.
    const nav: string[] = [];
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) nav.push(new URL(f.url()).pathname);
    });

    await page.getByRole("button", { name: "Place order" }).click();

    await page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: /confirmed/i })).toBeVisible();
    await expect(page.getByText(/Cash on Delivery/)).toBeVisible();
    await expect(page.getByText(/Pay .* on delivery/i)).toBeVisible();
    await expect(page.getByLabel("Cart, empty")).toBeVisible();

    // No empty-cart flash: the order placement goes straight to /order/<token>
    // without ever navigating to /cart.
    expect(nav.some((p) => p === "/cart")).toBe(false);
  });

  test("bKash: TrxID + screenshot → under-verification receipt", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillShipping(page);

    // Provide an optional email → receipt path is exercised (fake notifier);
    // the order must still complete normally.
    await page.getByLabel("Email (optional — for your receipt)").fill("buyer@example.com");
    await page.getByText("bKash / Nagad", { exact: true }).click();
    await page.getByLabel("TrxID").fill("ABC1D2E3F4");
    await page.getByLabel("Payment screenshot").setInputFiles(PNG);
    await page.getByRole("button", { name: "Place order" }).click();

    await page.waitForURL(/\/order\/[A-Za-z0-9_-]+$/);
    await expect(page.getByText(/under verification/i)).toBeVisible();
    await expect(page.getByText(/ABC1D2E3F4/)).toBeVisible();
    await expect(page.getByLabel("Cart, empty")).toBeVisible();
  });

  test("bKash: non-image upload is rejected, no order created", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillShipping(page);
    await page.getByText("bKash / Nagad", { exact: true }).click();
    await page.getByLabel("TrxID").fill("ABC1D2E3F4");
    await page.getByLabel("Payment screenshot").setInputFiles(TXT);
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText("Upload a JPEG, PNG, or WebP image.")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  });

  test("bKash: invalid TrxID is rejected", async ({ page }) => {
    await addToCart(page);
    await page.goto("/checkout");
    await fillShipping(page);
    await page.getByText("bKash / Nagad", { exact: true }).click();
    await page.getByLabel("TrxID").fill("!!");
    await page.getByLabel("Payment screenshot").setInputFiles(PNG);
    await page.getByRole("button", { name: "Place order" }).click();

    await expect(page.getByText(/TrxID/i).last()).toBeVisible();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("screenshot route is denied without an admin role", async ({ page }) => {
    const res = await page.goto("/api/admin/screenshot/deadbeefdeadbeefdeadbeefdeadbeef.png");
    expect(res?.status()).toBe(403);
  });

  test("order page denies an unknown token (IDOR)", async ({ page }) => {
    await page.goto("/order/this-token-does-not-exist");
    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await expect(page.getByText(/Thank you/i)).toHaveCount(0);
  });

  test("empty cart at checkout shows an inline empty state (no /cart bounce)", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });
});
