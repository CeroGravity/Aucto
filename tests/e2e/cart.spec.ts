import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// compression-top: S ample stock, XL low stock (2), M out of stock (0).
const PDP = "/products/compression-top";

async function addSize(page: Page, size: string): Promise<void> {
  await page.goto(PDP);
  await page.getByRole("button", { name: size, exact: true }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
}

// The single currently-open drawer. Radix can momentarily keep a closing
// instance mounted during RSC revalidation, so scope to the open one and take
// the first match to stay unambiguous.
function openDrawer(page: Page) {
  return page.locator('[role="dialog"][data-state="open"]').first();
}

test.describe("cart", () => {
  test("add from PDP opens the drawer and increments the count", async ({ page }) => {
    await addSize(page, "S");
    // Header count comes from the same server render as the drawer body, so
    // waiting on it means the revalidation has settled.
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

    const drawer = openDrawer(page);
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Compression Top")).toBeVisible();
    await expect(drawer.getByText("Size S")).toBeVisible();
  });

  test("qty stepper updates totals; remove empties the cart", async ({ page }) => {
    await addSize(page, "S");
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
    const drawer = openDrawer(page);

    // Increase to 2 → subtotal 2 × ৳1,900 = ৳3,800.
    await drawer.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByLabel("Cart, 2 items")).toBeVisible();
    await expect(drawer.getByText("৳3,800").first()).toBeVisible();

    // Remove the only item → empty state.
    await drawer.getByRole("button", { name: "Remove Compression Top" }).click();
    await expect(drawer.getByText("Your cart is empty.")).toBeVisible();
  });

  test("cart persists across reload (cookie)", async ({ page }) => {
    await addSize(page, "S");
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();

    // Let the background server action finish persisting before reloading
    // (the badge above is optimistic/instant).
    await page.waitForLoadState("networkidle");
    await page.reload();
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
  });

  test("cannot exceed a variant's stock", async ({ page }) => {
    // XL stock = 2.
    await addSize(page, "XL");
    await expect(page.getByLabel("Cart, 1 items")).toBeVisible();
    const drawer = openDrawer(page);

    const increase = drawer.getByRole("button", { name: "Increase quantity" });
    await increase.click();
    await expect(page.getByLabel("Cart, 2 items")).toBeVisible();
    await expect(increase).toBeDisabled();
  });

  test("cart page resolves", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1, name: "Cart" })).toBeVisible();
    // /checkout is now a real flow (redirects to /cart when empty) — covered in
    // checkout.spec.ts.
  });
});
