import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PASSWORD = "password123";
const PUBLISHED_SLUG = "compression-top"; // seeded, published

async function register(page: Page, email: string): Promise<void> {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account$/);
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

async function clickStatus(page: Page, name: string, expected: string): Promise<void> {
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.status() === 200),
    page.getByRole("button", { name, exact: true }).click(),
  ]);
  await page.reload();
  await expect(page.getByTestId("product-status")).toHaveText(expected);
}

test.describe("seo — real 404 status", () => {
  test("nonexistent product returns HTTP 404", async ({ page }) => {
    const res = await page.goto("/products/does-not-exist-xyz");
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/Page not found/i)).toBeVisible();
  });

  test("published product returns HTTP 200", async ({ page }) => {
    const res = await page.goto(`/products/${PUBLISHED_SLUG}`);
    expect(res?.status()).toBe(200);
  });

  test("draft and archived products return HTTP 404", async ({ page }) => {
    await makeAdmin(page, `seo-admin-${Date.now()}@aucto.test`);
    const name = `SEO Tee ${Date.now()}`;
    await page.goto("/admin/products/new");
    await page.getByLabel("Name").fill(name);
    await page.getByLabel("Description").fill("seo test");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Price (৳)").fill("1500");
    await page.getByRole("button", { name: "Create product" }).click();
    await page.waitForURL(/\/admin\/products\/\d+$/);
    const editUrl = page.url();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Created as a draft → PDP is 404.
    const draftRes = await page.goto(`/products/${slug}`);
    expect(draftRes?.status()).toBe(404);

    // Publish → 200, then archive → 404 again.
    await page.goto(editUrl);
    await clickStatus(page, "Publish", "published");
    const pubRes = await page.goto(`/products/${slug}`);
    expect(pubRes?.status()).toBe(200);

    await page.goto(editUrl);
    await clickStatus(page, "Archive", "archived");
    const archRes = await page.goto(`/products/${slug}`);
    expect(archRes?.status()).toBe(404);
  });
});

test.describe("seo — metadata, structured data, manifest", () => {
  test("published PDP has title, canonical, OG, and Product JSON-LD", async ({ page }) => {
    await page.goto(`/products/${PUBLISHED_SLUG}`);
    await expect(page).toHaveTitle(/· Aucto$/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", new RegExp(`/products/${PUBLISHED_SLUG}$`));
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const product = ld.map((s) => JSON.parse(s)).find((d) => d["@type"] === "Product");
    expect(product).toBeTruthy();
    expect(product.offers.priceCurrency).toBe("BDT");
    expect(product.offers.availability).toMatch(/schema\.org\/(InStock|OutOfStock)/);
  });

  test("home has Organization + WebSite JSON-LD", async ({ page }) => {
    await page.goto("/");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = ld.map((s) => JSON.parse(s)["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
  });

  test("sitemap lists published products and excludes private areas", async ({ page }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain(`/products/${PUBLISHED_SLUG}`);
    expect(xml).not.toContain("/admin");
    expect(xml).not.toContain("/checkout");
    expect(xml).not.toContain("/account");
  });

  test("robots disallows private areas and points to the sitemap", async ({ page }) => {
    const res = await page.request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toMatch(/Disallow: \/admin/);
    expect(txt).toMatch(/Disallow: \/account/);
    expect(txt).toMatch(/Disallow: \/checkout/);
    expect(txt).toMatch(/Disallow: \/api/);
    expect(txt).toMatch(/Sitemap:/);
  });

  test("manifest serves brand icons + navy theme-color", async ({ page }) => {
    const res = await page.request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = await res.json();
    expect(manifest.theme_color).toBe("#1B2A4D");
    expect(manifest.name).toMatch(/Aucto/);
    expect(JSON.stringify(manifest.icons)).toContain("/icon.png");
  });

  test("private pages are noindex", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
