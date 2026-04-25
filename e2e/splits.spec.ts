import { test, expect } from "./fixtures.js";
import {
  apiAddExclusion,
  apiAddItem,
  apiCreatePurchase,
  seedListWithMembers,
} from "./helpers/factories.js";

test.describe("splits", () => {
  test("the splits chip is hidden when no purchases exist", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob", "Carol"],
      listName: "Trip",
    });
    await apiAddItem(request, list.id, "Milk", owner.id);
    await page.reload();

    await expect(
      page.getByRole("button", { name: /view splits/i }),
    ).toHaveCount(0);
  });

  test("after a single purchase the chip shows the total and the modal lists owes-rows", async ({
    page,
    request,
  }) => {
    const { owner, others, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob", "Carol"],
      listName: "Trip",
    });
    const milk = await apiAddItem(request, list.id, "Milk", owner.id);

    // Alice pays $9 split 3 ways → Bob and Carol each owe Alice $3.
    await apiCreatePurchase(request, list.id, {
      payerUserId: owner.id,
      items: [{ itemId: milk.id, priceCents: 900 }],
    });
    await page.reload();

    const chip = page.getByRole("button", {
      name: /view splits \(\$9\.00 total\)/i,
    });
    await expect(chip).toBeVisible();
    await chip.click();

    const splitsModal = page
      .getByRole("heading", { name: "Cost Splitting" })
      .locator("../..");
    const rows = splitsModal.getByRole("listitem");
    await expect(rows).toHaveCount(2);

    const bob = others[0];
    const carol = others[1];
    await expect(splitsModal).toContainText(bob.name);
    await expect(splitsModal).toContainText(carol.name);
    // Both rows show $3.00 owed to Alice.
    await expect(rows.filter({ hasText: bob.name })).toContainText("$3.00");
    await expect(rows.filter({ hasText: carol.name })).toContainText("$3.00");
  });

  test("an excluded member doesn't appear in the item's debt graph", async ({
    page,
    request,
  }) => {
    const { owner, others, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob", "Carol"],
      listName: "Trip",
    });
    const milk = await apiAddItem(request, list.id, "Milk", owner.id);

    // Carol is excluded from Milk; Alice pays $10. Splits 2 ways → Bob owes Alice $5.
    await apiAddExclusion(request, milk.id, others[1].id); // Carol
    await apiCreatePurchase(request, list.id, {
      payerUserId: owner.id,
      items: [{ itemId: milk.id, priceCents: 1000 }],
    });
    await page.reload();

    await page
      .getByRole("button", { name: /view splits \(\$10\.00 total\)/i })
      .click();
    const splitsModal = page
      .getByRole("heading", { name: "Cost Splitting" })
      .locator("../..");

    const rows = splitsModal.getByRole("listitem");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(others[0].name); // Bob
    await expect(rows.first()).toContainText("$5.00");
    await expect(splitsModal).not.toContainText(others[1].name); // Carol absent
  });

  test("two purchases by different payers net out and drop settled members", async ({
    page,
    request,
  }) => {
    const { owner, others, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob", "Carol"],
      listName: "Trip",
    });
    const bob = others[0];
    const carol = others[1];
    const milk = await apiAddItem(request, list.id, "Milk", owner.id);
    const bread = await apiAddItem(request, list.id, "Bread", owner.id);

    // Alice pays $9 for milk → Bob owes Alice $3, Carol owes Alice $3.
    await apiCreatePurchase(request, list.id, {
      payerUserId: owner.id,
      items: [{ itemId: milk.id, priceCents: 900 }],
    });
    // Bob pays $9 for bread → Alice owes Bob $3, Carol owes Bob $3.
    // Net: Alice ↔ Bob settles. Carol owes Alice $3 and owes Bob $3.
    await apiCreatePurchase(request, list.id, {
      payerUserId: bob.id,
      items: [{ itemId: bread.id, priceCents: 900 }],
    });
    await page.reload();

    await page
      .getByRole("button", { name: /view splits \(\$18\.00 total\)/i })
      .click();
    const splitsModal = page
      .getByRole("heading", { name: "Cost Splitting" })
      .locator("../..");
    const rows = splitsModal.getByRole("listitem");
    await expect(rows).toHaveCount(2);

    // Each row should be Carol owing $3 — once to Alice, once to Bob.
    const carolRows = rows.filter({ hasText: carol.name });
    await expect(carolRows).toHaveCount(2);
    await expect(carolRows.first()).toContainText("$3.00");
    await expect(carolRows.last()).toContainText("$3.00");
    // Alice ↔ Bob row absent (settled): no row contains both names.
    await expect(
      rows.filter({ hasText: owner.name }).filter({ hasText: bob.name }),
    ).toHaveCount(0);
  });

  test("the splits modal closes via × and via the backdrop", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    const milk = await apiAddItem(request, list.id, "Milk", owner.id);
    await apiCreatePurchase(request, list.id, {
      payerUserId: owner.id,
      items: [{ itemId: milk.id, priceCents: 600 }],
    });
    await page.reload();

    const chip = page.getByRole("button", { name: /view splits/i });

    // × button closes.
    await chip.click();
    await expect(
      page.getByRole("heading", { name: "Cost Splitting" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /close splits/i }).click();
    await expect(
      page.getByRole("heading", { name: "Cost Splitting" }),
    ).toHaveCount(0);

    // Backdrop click closes.
    await chip.click();
    await expect(
      page.getByRole("heading", { name: "Cost Splitting" }),
    ).toBeVisible();
    // Click the backdrop in the top-left corner — the modal occupies the
    // center of the viewport and would intercept a center click.
    await page.locator("div.bg-black\\/40").click({ position: { x: 5, y: 5 } });
    await expect(
      page.getByRole("heading", { name: "Cost Splitting" }),
    ).toHaveCount(0);
  });
});
