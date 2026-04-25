import { test, expect } from "./fixtures.js";

test.describe("identity", () => {
  test("logs in with a non-default color and shows a swatch in that color", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByPlaceholder("Your name").fill("Alice");
    // Pick the red swatch — color buttons expose their hex via aria-label.
    await page.getByRole("button", { name: "#dc2626" }).click();
    await page.getByRole("button", { name: /^log in$/i }).click();

    // Identity card visible.
    const logout = page.getByRole("button", { name: /log out/i });
    await expect(logout).toBeVisible();

    // The swatch span sits next to the name in the identity card; assert its
    // computed background-color matches the picked hex.
    const swatch = page
      .locator("span.rounded-full")
      .filter({ hasNotText: "Alice" })
      .first();
    await expect(swatch).toHaveCSS("background-color", "rgb(220, 38, 38)");
  });

  test("identity persists across a full page reload", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Your name").fill("Alice");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();

    await page.reload();

    // Login form should be gone; logout button still here.
    await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();
    await expect(page.getByPlaceholder("Your name")).toHaveCount(0);
  });

  test("logging out clears localStorage and re-shows the login form", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByPlaceholder("Your name").fill("Alice");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page.getByRole("button", { name: /log out/i })).toBeVisible();

    await page.getByRole("button", { name: /log out/i }).click();

    await expect(page.getByPlaceholder("Your name")).toBeVisible();
    const stored = await page.evaluate(() =>
      localStorage.getItem("hestia-user"),
    );
    expect(stored).toBeNull();
  });

  test("Log in button is disabled for empty or whitespace names", async ({
    page,
  }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: /^log in$/i });
    await expect(button).toBeDisabled();

    await page.getByPlaceholder("Your name").fill("   ");
    await expect(button).toBeDisabled();

    await page.getByPlaceholder("Your name").fill("Alice");
    await expect(button).toBeEnabled();
  });
});
