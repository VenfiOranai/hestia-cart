import { test, expect } from "./fixtures.js";
import { addItemUI, createListUI, loginAs } from "./helpers/factories.js";

test.describe("home", () => {
  test("list-name input is disabled and prompts a login when logged out", async ({
    page,
  }) => {
    await page.goto("/");
    const input = page.getByPlaceholder("Log in first");
    await expect(input).toBeVisible();
    await expect(input).toBeDisabled();
    await expect(
      page.getByRole("button", { name: /^create$/i }),
    ).toBeDisabled();
  });

  test("creating a list redirects to it and auto-adds the creator as a member", async ({
    page,
  }) => {
    await loginAs(page, "Alice");
    await page.getByPlaceholder(/weekly groceries/i).fill("Weekend trip");
    await page.getByRole("button", { name: /^create$/i }).click();

    await page.waitForURL(/\/list\/\d+/);
    await expect(
      page.getByRole("heading", { name: "Weekend trip" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /view members/i }),
    ).toContainText("1 member");
  });

  test("a brand-new user sees the empty My Lists state", async ({ page }) => {
    await loginAs(page, "Alice");
    await expect(page.getByText("No lists yet")).toBeVisible();
  });

  test("a created list appears in My Lists with member and item counts", async ({
    page,
  }) => {
    await loginAs(page, "Alice");
    await createListUI(page, "Pantry");

    await page.getByRole("link", { name: /back to home/i }).click();
    await page.waitForURL("http://localhost:5174/");

    const card = page.getByRole("link", { name: /pantry/i });
    await expect(card).toBeVisible();
    await expect(card).toContainText("1 member");
    await expect(card).toContainText("0 items");
  });

  test("item count updates on the home card after returning from the list", async ({
    page,
  }) => {
    await loginAs(page, "Alice");
    await createListUI(page, "Pantry");

    await addItemUI(page, "Milk");
    await expect(page.getByText("Milk")).toBeVisible();

    await page.getByRole("link", { name: /back to home/i }).click();
    await page.waitForURL("http://localhost:5174/");

    await expect(page.getByRole("link", { name: /pantry/i })).toContainText(
      "1 item",
    );
  });
});
