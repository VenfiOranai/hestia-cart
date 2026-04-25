import { test, expect } from "./fixtures.js";
import {
  addItemUI,
  apiAddItem,
  seedLoggedInOnList,
} from "./helpers/factories.js";

test.describe("items", () => {
  test("an added item appears with author credit in the user's color", async ({
    page,
    request,
  }) => {
    await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
      userColor: "#dc2626", // red — distinct so the color check is meaningful
    });

    await addItemUI(page, "Milk");

    const milkRow = page.getByRole("listitem").filter({ hasText: "Milk" });
    await expect(milkRow).toBeVisible();

    // The "by Alice" credit's inner span carries the user's color.
    const alice = milkRow.locator("span", { hasText: /^Alice$/ });
    await expect(alice.first()).toHaveCSS("color", "rgb(220, 38, 38)");
  });

  test("clicking the state badge cycles needed → in cart → purchased → needed", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", user.id);

    const milkRow = page.getByRole("listitem").filter({ hasText: "Milk" });
    await expect(milkRow).toBeVisible();
    const badge = milkRow.getByTitle(/currently:/i);

    await expect(badge).toHaveText("needed");
    await badge.click();
    await expect(badge).toHaveText("in cart");
    await badge.click();
    await expect(badge).toHaveText("purchased");
    // Item name now line-through.
    await expect(milkRow.getByText("Milk")).toHaveClass(/line-through/);
    await badge.click();
    await expect(badge).toHaveText("needed");
  });

  test("purchased items render under the Purchased group", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Cookies", user.id);
    await page.reload();

    // Cycle Cookies to purchased (needed → inCart → purchased).
    const row = page.getByRole("listitem").filter({ hasText: "Cookies" });
    const badge = row.getByTitle(/currently:/i);
    await badge.click();
    await badge.click();
    await expect(badge).toHaveText("purchased");

    await expect(
      page.getByRole("button", { name: /purchased \(1\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /needed \(\d+\)/i }),
    ).toHaveCount(0);
  });

  test("group collapse state survives interacting with another group", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", user.id);
    await apiAddItem(request, list.id, "Bread", user.id);
    await page.reload();

    const neededHeader = page.getByRole("button", { name: /needed \(2\)/i });
    await expect(neededHeader).toHaveAttribute("aria-expanded", "true");

    await neededHeader.click();
    await expect(neededHeader).toHaveAttribute("aria-expanded", "false");

    // Add another item — collapse state for "Needed" should persist.
    await addItemUI(page, "Eggs");
    // Wait for the count to bump to 3, and the collapsed flag to remain.
    await expect(
      page.getByRole("button", { name: /needed \(3\)/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  test("deleting an item removes it and shows an Item removed toast", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", user.id);
    await page.reload();

    const row = page.getByRole("listitem").filter({ hasText: "Milk" });
    await row.getByTitle("Delete item").click();

    await expect(page.getByRole("status")).toHaveText("Item removed");
    await expect(page.getByText("Milk")).toHaveCount(0);
  });

  test("an empty list shows the No items yet card", async ({
    page,
    request,
  }) => {
    await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await expect(page.getByText("No items yet")).toBeVisible();
  });
});
