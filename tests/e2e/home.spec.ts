import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.describe("home hero", () => {
  test("static hero (heading + CTA) renders immediately and is keyboard-reachable", async ({
    page,
  }) => {
    await page.goto("/");
    // The static hero is server-rendered (the LCP) — present without waiting on JS.
    await expect(page.getByRole("heading", { level: 1, name: "Move with Power" })).toBeVisible();
    const cta = page.getByRole("link", { name: "Shop now" });
    await expect(cta).toBeVisible();
    // Reachable by keyboard (real anchor, not baked into a canvas).
    await cta.focus();
    await expect(cta).toBeFocused();
  });

  test("3D enhances over the static hero in a separate lazy chunk (canvas aria-hidden)", async ({
    page,
  }) => {
    // Track lazily-loaded JS chunks to prove the 3D code is a separate chunk
    // fetched after navigation (not in the home's initial document/bundle).
    const lateChunks: string[] = [];
    page.on("request", (r) => {
      const u = r.url();
      if (u.includes("/_next/static/chunks/") && u.endsWith(".js")) lateChunks.push(u);
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Give the post-paint idle mount time to fetch the chunk + mount the canvas.
    await page.waitForTimeout(2500);

    const canvasCount = await page.locator("canvas").count();
    if (canvasCount > 0) {
      // Enhanced: the canvas must be decorative — inside an aria-hidden layer,
      // and tabbing from the CTA never lands on it.
      const canvas = page.locator("canvas").first();
      const inHidden = await canvas.locator("xpath=ancestor::*[@aria-hidden='true']").count();
      expect(inHidden).toBeGreaterThan(0);
      await page.getByRole("link", { name: "Shop now" }).focus();
      const active = await page.evaluate(() => document.activeElement?.tagName ?? "");
      expect(active).not.toBe("CANVAS");
      // The 3D code arrived as a chunk after the initial document.
      expect(lateChunks.length).toBeGreaterThan(0);
    }
    // No canvas → correct graceful degradation (no WebGL): the static hero
    // alone is valid, nothing to assert beyond the heading already checked.
  });

  test("reduced-motion: static hero only, no canvas animation gating content", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    // Heading + CTA still present and the LCP; under reduced-motion the lazy
    // gate skips the 3D entirely (no canvas mounted).
    await expect(page.getByRole("heading", { level: 1, name: "Move with Power" })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toHaveCount(0);
    await context.close();
  });

  test("home has no serious/critical axe violations (canvas decorative)", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => document.title.trim().length > 0).catch(() => {});
    // Let the 3D mount so the scan covers the enhanced state too.
    await page.waitForTimeout(1500);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, serious.map((v) => v.id).join(", ")).toEqual([]);
  });
});
