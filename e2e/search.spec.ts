import { test, expect } from "./fixtures.js";
import { apiAddItem, seedLoggedInOnList } from "./helpers/factories.js";

test.describe("search", () => {
  test("search bar only renders when there are items", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });

    await expect(page.getByPlaceholder("Search items...")).toHaveCount(0);

    await apiAddItem(request, list.id, "Milk", user.id);
    await expect(page.getByPlaceholder("Search items...")).toBeVisible();
  });

  test("typing filters items live with case-insensitive substring match", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Apples", user.id);
    await apiAddItem(request, list.id, "Bananas", user.id);
    await apiAddItem(request, list.id, "Pineapple", user.id);
    await page.reload();

    const search = page.getByPlaceholder("Search items...");
    await search.fill("APPL");

    await expect(page.getByText("Apples")).toBeVisible();
    await expect(page.getByText("Pineapple")).toBeVisible();
    await expect(page.getByText("Bananas")).toHaveCount(0);
  });

  test("shows an empty-state card when nothing matches the query", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", user.id);
    await page.reload();

    await page.getByPlaceholder("Search items...").fill("zzz");
    await expect(page.getByText(/no items match/i)).toBeVisible();
    // The empty-state copy quotes the query with Unicode curly quotes; match
    // the query loosely rather than depending on the exact glyphs.
    await expect(page.getByText(/zzz/)).toBeVisible();
  });

  test("collapsed groups are forced open while a search query is active", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Apples", user.id);
    await apiAddItem(request, list.id, "Bread", user.id);
    await page.reload();

    // The header label includes the group count, which shifts as the search
    // narrows the list. Match by prefix only.
    const neededHeader = page.getByRole("button", { name: /^needed \(/i });
    await neededHeader.click();
    await expect(neededHeader).toHaveAttribute("aria-expanded", "false");

    await page.getByPlaceholder("Search items...").fill("appl");
    await expect(neededHeader).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Apples")).toBeVisible();
  });

  test("clearing via the × button restores the full list", async ({
    page,
    request,
  }) => {
    const { user, list } = await seedLoggedInOnList(page, request, {
      userName: "Alice",
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Apples", user.id);
    await apiAddItem(request, list.id, "Bread", user.id);
    await page.reload();

    const search = page.getByPlaceholder("Search items...");
    await search.fill("appl");
    await expect(page.getByText("Bread")).toHaveCount(0);

    await page.getByRole("button", { name: /clear search/i }).click();
    await expect(search).toHaveValue("");
    await expect(page.getByText("Apples")).toBeVisible();
    await expect(page.getByText("Bread")).toBeVisible();
  });
});
