import { expect, test } from "./fixtures";

test.describe("brand", () => {
  test("home hero shows the motto and footer shows the dictionary entry", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Move with Power" })).toBeVisible();

    // Header brand logo link.
    await expect(page.getByRole("link", { name: "Aucto home" })).toBeVisible();

    // Footer dictionary entry.
    await expect(
      page.getByText(/Growth; advancement; the act of creating and elevating/),
    ).toBeVisible();
  });

  test("about page shows the brand story", async ({ page }) => {
    await page.goto("/about");

    await expect(page.getByRole("heading", { level: 1, name: "Move with Power" })).toBeVisible();
    await expect(page.getByText(/to increase/).first()).toBeVisible();
  });
});
