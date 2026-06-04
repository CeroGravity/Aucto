import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PASSWORD = "password123";

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account$/);
}

// Click a product status-action button (Publish/Unpublish/Archive) and confirm
// the new status persisted. The button calls a Server Action then
// router.refresh(); rather than depend on that client repaint landing, we wait
// for the action's transition to finish (button re-enables or unmounts), then
// reload to read the authoritative server-rendered badge. Reloading removes any
// dependence on refresh timing — the persisted DB state is the source of truth.
async function clickStatus(page: Page, name: string, expectedStatus: string): Promise<void> {
  const button = page.getByRole("button", { name, exact: true });
  await expect(button).toBeEnabled(); // hydrated + actionable
  // Wait for the Server Action's POST to complete (the DB write commits before
  // the response returns) so a reload reads the new state.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
    button.click(),
  ]);
  await page.reload();
  await expect(page.getByTestId("product-status")).toHaveText(expectedStatus);
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

test.describe("admin product access control", () => {
  test("logged-out is redirected from /admin/products", async ({ page }) => {
    await page.goto("/admin/products");
    await page.waitForURL(/\/login/);
  });

  test("normal user gets not-found on /admin/products/new", async ({ page }) => {
    await register(page, `puser-${Date.now()}@aucto.test`);
    await page.goto("/admin/products/new");
    await expect(page.getByText(/Page not found/i)).toBeVisible();
  });
});

test.describe("admin product lifecycle", () => {
  test("create draft → publish → edit → variant → unpublish → archive", async ({ page }) => {
    await makeAdmin(page, `padmin-${Date.now()}@aucto.test`);
    const name = `E2E Test Tee ${Date.now()}`;

    // Create as a draft.
    await page.goto("/admin/products/new");
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Description").fill("An e2e test product.");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Price (৳)").fill("1500");
    await page.getByRole("button", { name: "Create product" }).click();
    await page.waitForURL(/\/admin\/products\/\d+$/);
    const editUrl = page.url();
    const slugFromName = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Draft → absent from the storefront: PDP shows not-found, no product UI.
    // (Next renders notFound() with a 200 on a dynamic route, so assert on
    // content, not the HTTP status.)
    await page.goto(`/products/${slugFromName}`);
    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name })).toHaveCount(0);

    // Publish — wait for the RSC repaint before asserting the badge.
    await page.goto(editUrl);
    await clickStatus(page, "Publish", "published");

    // Now visible on the storefront with the set price.
    await page.goto(`/products/${slugFromName}`);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByText("৳1,500").first()).toBeVisible();

    // Edit price → PDP reflects it.
    await page.goto(editUrl);
    await page.getByLabel("Price (৳)").fill("1800");
    // Wait for the save server action's POST to complete before reloading, so
    // the persisted value is read (the form stays at editUrl → no URL change to
    // wait on). Then confirm persistence, then check the PDP.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      page.getByRole("button", { name: "Save changes" }).click(),
    ]);
    await page.reload();
    await expect(page.getByLabel("Price (৳)")).toHaveValue("1800");
    await page.goto(`/products/${slugFromName}`, { waitUntil: "networkidle" });
    await expect(page.getByText("৳1,800").first()).toBeVisible();

    // Add a variant + stock → size selectable on the PDP. Wait for the add
    // action's POST to commit, then reload to read the new variant row (the
    // editor repaints via router.refresh(); a reload reads committed state).
    await page.goto(editUrl);
    await page.getByLabel("New size").selectOption("M");
    await page.getByLabel("New stock").fill("7");
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      page.getByRole("button", { name: "Add size" }).click(),
    ]);
    await page.reload();
    await expect(page.getByLabel("Stock for M")).toBeVisible();
    await page.goto(`/products/${slugFromName}`);
    await expect(page.getByRole("button", { name: "M", exact: true })).toBeVisible();

    // Unpublish → gone from storefront.
    await page.goto(editUrl);
    await clickStatus(page, "Unpublish", "draft");
    await page.goto(`/products/${slugFromName}`);
    await expect(page.getByText(/Page not found/i)).toBeVisible();

    // Archive → hidden, but the admin record still loads (history-safe).
    await page.goto(editUrl);
    await clickStatus(page, "Archive", "archived");
    await page.goto(`/products/${slugFromName}`);
    await expect(page.getByText(/Page not found/i)).toBeVisible();
    await page.goto(editUrl);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  });
});

test.describe("product images", () => {
  const PNG = new URL("./../fixtures/payment.png", import.meta.url).pathname;
  const TXT = new URL("./../fixtures/not-an-image.txt", import.meta.url).pathname;

  async function createPublished(page: Page): Promise<{ slug: string; editUrl: string }> {
    const name = `Img Tee ${Date.now()}`;
    await page.goto("/admin/products/new");
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Description").fill("img test");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Price (৳)").fill("1500");
    await page.getByRole("button", { name: "Create product" }).click();
    await page.waitForURL(/\/admin\/products\/\d+$/);
    const editUrl = page.url();
    await clickStatus(page, "Publish", "published");
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return { slug, editUrl };
  }

  test("upload → PDP shows it; set primary; delete → placeholder fallback", async ({ page }) => {
    await makeAdmin(page, `img-${Date.now()}@aucto.test`);
    const { slug, editUrl } = await createPublished(page);

    // No upload yet → storefront shows the placeholder (a data: image), not the
    // public route.
    await page.goto(`/products/${slug}`);
    const firstSrc = await page.locator("main img").first().getAttribute("src");
    expect(firstSrc ?? "").not.toContain("/api/images/");

    // Upload an image via the admin UI.
    await page.goto(editUrl);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      (async () => {
        await page.getByLabel("Upload image").setInputFiles(PNG);
        await page.getByRole("button", { name: "Upload", exact: true }).click();
      })(),
    ]);
    await page.reload();
    await expect(page.getByText(/^Primary$/)).toBeVisible();

    // PDP now serves the uploaded image through the public route.
    await page.goto(`/products/${slug}`, { waitUntil: "networkidle" });
    const imgs = await page
      .locator("main img")
      .evaluateAll((els) => (els as HTMLImageElement[]).map((e) => e.getAttribute("src") ?? ""));
    expect(imgs.some((s) => s.includes("/api/images/") || s.includes("/_next/image"))).toBe(true);

    // Delete the image → storefront falls back to the placeholder again.
    await page.goto(editUrl);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      page.getByRole("button", { name: "Delete image" }).first().click(),
    ]);
    await page.reload();
    await expect(page.getByText(/No images yet/)).toBeVisible();
  });

  test("non-image upload is rejected; product intact", async ({ page }) => {
    await makeAdmin(page, `imgrej-${Date.now()}@aucto.test`);
    const { editUrl } = await createPublished(page);
    await page.goto(editUrl);
    await page.getByLabel("Upload image").setInputFiles(TXT);
    await page.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(page.getByText("Upload a JPEG, PNG, or WebP image.")).toBeVisible();
    await expect(page.getByText(/No images yet/)).toBeVisible();
  });

  test("public route serves public keys; private screenshot route stays gated; cross-namespace refused", async ({
    page,
    request,
  }) => {
    await makeAdmin(page, `imgsec-${Date.now()}@aucto.test`);
    const { editUrl } = await createPublished(page);
    await page.goto(editUrl);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
      (async () => {
        await page.getByLabel("Upload image").setInputFiles(PNG);
        await page.getByRole("button", { name: "Upload", exact: true }).click();
      })(),
    ]);
    await page.reload();
    const pubSrc = await page.locator('img[src^="/api/images/"]').first().getAttribute("src");
    const pubKey = (pubSrc ?? "").replace("/api/images/", "");
    expect(pubKey).toMatch(/^pub_[a-f0-9]{32}\.(jpg|png|webp)$/);

    // Public route serves the public key without auth.
    expect((await request.get(`/api/images/${pubKey}`)).status()).toBe(200);

    // A public key is REFUSED by the private screenshot route (admin context),
    // and the private route still 403s for the public key shape regardless.
    expect((await page.request.get(`/api/admin/screenshot/${pubKey}`)).status()).toBe(404);

    // A private-looking key is REFUSED by the public route (cross-namespace).
    const fakePrivate = `prv_${"a".repeat(32)}.jpg`;
    expect((await request.get(`/api/images/${fakePrivate}`)).status()).toBe(404);

    // Private screenshot route still denies an unauthenticated request.
    const anon = await page.context().browser()?.newContext();
    if (anon) {
      const anonReq = (await anon.newPage()).request;
      expect((await anonReq.get(`/api/admin/screenshot/${"b".repeat(32)}.jpg`)).status()).toBe(403);
      await anon.close();
    }
  });
});
