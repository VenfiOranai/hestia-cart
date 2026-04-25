import { test, expect } from "./fixtures.js";
import { apiAddItem, seedListWithMembers } from "./helpers/factories.js";

test.describe("exclusions", () => {
  test("opening the exclusion modal lists every member as a checkbox", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", owner.id);
    await page.reload();

    const milkRow = page.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow.getByLabel("Edit split participants").click();

    await expect(
      page.getByRole("heading", { name: /split: milk/i }),
    ).toBeVisible();

    const modal = page
      .getByRole("heading", { name: /split: milk/i })
      .locator("../..");
    await expect(modal.getByRole("checkbox")).toHaveCount(2);
    await expect(
      modal.getByRole("checkbox", { name: /alice/i }),
    ).toBeChecked();
    await expect(
      modal.getByRole("checkbox", { name: /bob/i }),
    ).toBeChecked();
  });

  test("excluding a member shows the not-<name> badge and reduces the avatar count", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", owner.id);
    await page.reload();

    const milkRow = page.getByRole("listitem").filter({ hasText: "Milk" });
    const avatarsButton = milkRow.getByLabel("Edit split participants");
    // Initial: 2 participant avatars (Alice, Bob).
    await expect(avatarsButton.locator("span.rounded-full")).toHaveCount(2);

    await avatarsButton.click();
    const modal = page
      .getByRole("heading", { name: /split: milk/i })
      .locator("../..");
    // The checkbox is controlled and only flips after the API resolves, so
    // .uncheck()'s post-condition assertion would race the network round-trip.
    // Use a plain click and confirm the visible "excluded" tag instead.
    await modal.getByRole("checkbox", { name: /bob/i }).click();
    await expect(modal.locator("li").filter({ hasText: /bob/i })).toContainText(
      /excluded/i,
    );
    await modal.getByRole("button", { name: /^done$/i }).click();

    await expect(milkRow).toContainText(/not bob/i);
    await expect(avatarsButton.locator("span.rounded-full")).toHaveCount(1);
  });

  test("re-checking a previously excluded member removes the badge", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", owner.id);
    await page.reload();

    const milkRow = page.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow.getByLabel("Edit split participants").click();

    const modal = page
      .getByRole("heading", { name: /split: milk/i })
      .locator("../..");
    const bob = modal.getByRole("checkbox", { name: /bob/i });
    const bobRow = modal.locator("li").filter({ hasText: /bob/i });
    await bob.click();
    await expect(bobRow).toContainText(/excluded/i);
    await bob.click();
    await expect(modal.getByText(/excluded/i)).toHaveCount(0);
    await modal.getByRole("button", { name: /^done$/i }).click();

    await expect(milkRow).not.toContainText(/not bob/i);
  });

  test("excluding every member shows 'nobody' instead of avatars", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", owner.id);
    await page.reload();

    const milkRow = page.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow.getByLabel("Edit split participants").click();

    const modal = page
      .getByRole("heading", { name: /split: milk/i })
      .locator("../..");
    await modal.getByRole("checkbox", { name: /alice/i }).click();
    // Wait for the first toggle to settle before issuing the next one — the
    // saving-state lock disables the disabled prop on a single row at a time.
    await expect(
      modal.locator("li").filter({ hasText: /alice/i }),
    ).toContainText(/excluded/i);
    await modal.getByRole("checkbox", { name: /bob/i }).click();
    await expect(modal.getByText(/excluded/i)).toHaveCount(2);
    await modal.getByRole("button", { name: /^done$/i }).click();

    const avatarsButton = milkRow.getByLabel("Edit split participants");
    await expect(avatarsButton).toContainText(/nobody/i);
    await expect(avatarsButton.locator("span.rounded-full")).toHaveCount(0);
  });
});
