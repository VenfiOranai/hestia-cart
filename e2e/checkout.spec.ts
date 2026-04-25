import { test, expect, type Page } from "./fixtures.js";
import {
  apiAddItem,
  apiUpdateItem,
  seedListWithMembers,
} from "./helpers/factories.js";

/** Locate the Record-Purchase modal container. The modal heading and the
 *  page-level trigger button share the same text "Record Purchase", so we
 *  scope by walking up from the modal's heading element. */
function checkoutModal(page: Page) {
  return page
    .getByRole("heading", { name: "Record Purchase" })
    .locator("../..");
}

test.describe("checkout", () => {
  test("items already in 'purchased' state are pre-selected when the modal opens", async ({
    page,
    request,
  }) => {
    const { owner, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    const milk = await apiAddItem(request, list.id, "Milk", owner.id);
    await apiAddItem(request, list.id, "Bread", owner.id);
    await apiUpdateItem(request, milk.id, { cartState: "purchased" });
    await page.reload();

    await page.getByRole("button", { name: "Record Purchase" }).click();
    const modal = checkoutModal(page);

    await expect(
      modal.getByRole("listitem").filter({ hasText: "Milk" }).getByRole("checkbox"),
    ).toBeChecked();
    await expect(
      modal.getByRole("listitem").filter({ hasText: "Bread" }).getByRole("checkbox"),
    ).not.toBeChecked();
  });

  test("submitting with a blank price for a selected item shows an inline error", async ({
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

    await page.getByRole("button", { name: "Record Purchase" }).click();
    const modal = checkoutModal(page);
    await modal
      .getByRole("listitem")
      .filter({ hasText: "Milk" })
      .getByRole("checkbox")
      .check();
    // Leave the price blank.
    await modal.getByRole("button", { name: "Record Purchase" }).click();

    await expect(modal).toContainText(
      /enter a price for every selected item/i,
    );
  });

  test("submitting with a $0 price reports it by item name", async ({
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

    await page.getByRole("button", { name: "Record Purchase" }).click();
    const modal = checkoutModal(page);
    const milkRow = modal.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow.getByRole("checkbox").check();
    await milkRow.getByPlaceholder("0.00").fill("0");
    await modal.getByRole("button", { name: "Record Purchase" }).click();

    await expect(modal).toContainText(/invalid price for "milk"/i);
  });

  test("the submit button is disabled when nothing is selected", async ({
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

    await page.getByRole("button", { name: "Record Purchase" }).click();
    const modal = checkoutModal(page);
    const submit = modal.getByRole("button", { name: "Record Purchase" });
    // Nothing's pre-selected (Milk is in 'needed' state).
    await expect(submit).toBeDisabled();

    // Selecting then deselecting brings us back to disabled.
    const milkCheckbox = modal
      .getByRole("listitem")
      .filter({ hasText: "Milk" })
      .getByRole("checkbox");
    await milkCheckbox.check();
    await expect(submit).toBeEnabled();
    await milkCheckbox.uncheck();
    await expect(submit).toBeDisabled();
  });

  test("selecting a different payer records the purchase under their id", async ({
    page,
    request,
  }) => {
    const { owner, others, list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob"],
      listName: "Trip",
    });
    const bob = others[0];
    await apiAddItem(request, list.id, "Milk", owner.id);
    await page.reload();

    await page.getByRole("button", { name: "Record Purchase" }).click();
    const modal = checkoutModal(page);

    // Default payer is the current user, marked "(you)".
    const payerSelect = modal.locator("select");
    await expect(payerSelect).toHaveValue(String(owner.id));
    await expect(payerSelect.locator("option:checked")).toContainText("(you)");

    // Switch to Bob and submit.
    await payerSelect.selectOption(String(bob.id));
    const milkRow = modal.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow.getByRole("checkbox").check();
    await milkRow.getByPlaceholder("0.00").fill("4.00");
    await modal.getByRole("button", { name: "Record Purchase" }).click();

    // Modal closes; toast appears.
    await expect(
      page.getByRole("heading", { name: "Record Purchase" }),
    ).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("Purchase recorded");

    // Verify on the server side that the payer is Bob.
    const purchases = await request
      .get(`/api/lists/${list.id}/purchases`)
      .then((r) => r.json());
    expect(purchases).toHaveLength(1);
    expect(purchases[0].payerUserId).toBe(bob.id);
  });

  test("a successful submission closes the modal, fires a toast, and reveals the splits chip", async ({
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

    await page.getByRole("button", { name: "Record Purchase" }).click();
    const modal = checkoutModal(page);
    const milkRow = modal.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow.getByRole("checkbox").check();
    await milkRow.getByPlaceholder("0.00").fill("5.00");
    await modal.getByRole("button", { name: "Record Purchase" }).click();

    await expect(
      page.getByRole("heading", { name: "Record Purchase" }),
    ).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("Purchase recorded");
    await expect(
      page.getByRole("button", { name: /view splits \(\$5\.00 total\)/i }),
    ).toBeVisible();
  });

  test("reopening checkout for a previously priced item pre-fills under 'Already recorded'", async ({
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

    // First purchase: $5.00.
    await page.getByRole("button", { name: "Record Purchase" }).click();
    let modal = checkoutModal(page);
    const milkRow = () =>
      modal.getByRole("listitem").filter({ hasText: "Milk" });
    await milkRow().getByRole("checkbox").check();
    await milkRow().getByPlaceholder("0.00").fill("5.00");
    await modal.getByRole("button", { name: "Record Purchase" }).click();
    await expect(
      page.getByRole("heading", { name: "Record Purchase" }),
    ).toHaveCount(0);

    // Reopen — Milk lives under "Already recorded" with the prior price.
    await page.getByRole("button", { name: "Record Purchase" }).click();
    modal = checkoutModal(page);
    await expect(modal).toContainText(/already recorded/i);
    const reopenedRow = modal.getByRole("listitem").filter({ hasText: "Milk" });
    // Pre-selected because cartState flipped to purchased.
    await expect(reopenedRow.getByRole("checkbox")).toBeChecked();
    await expect(reopenedRow.getByPlaceholder("0.00")).toHaveValue("5.00");
  });
});
