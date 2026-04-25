import { test, expect } from "./fixtures.js";
import {
  apiAddItem,
  apiAddMember,
  apiCreateList,
  apiCreatePurchase,
  apiCreateUser,
  apiUpdateItem,
  pageAsMember,
} from "./helpers/factories.js";

/**
 * Each test sets up Alice + Bob (and sometimes Carol) on the same list,
 * opens both pages with `pageAsMember` (which awaits the WebSocket open
 * before returning), then triggers a mutation via the API and asserts that
 * the *other* page's UI reflects the broadcast within 5s.
 */
test.describe("realtime", () => {
  async function setupAliceAndBob(request: Parameters<typeof apiCreateList>[0]) {
    const alice = await apiCreateUser(request, "Alice");
    const bob = await apiCreateUser(request, "Bob");
    const list = await apiCreateList(request, "Trip");
    await apiAddMember(request, list.id, alice.id);
    await apiAddMember(request, list.id, bob.id);
    return { alice, bob, list };
  }

  test("item:added — Bob sees an item Alice added", async ({
    browser,
    request,
  }) => {
    const { alice, bob, list } = await setupAliceAndBob(request);
    await pageAsMember(browser, alice, list);
    const bobPage = await pageAsMember(browser, bob, list);

    await apiAddItem(request, list.id, "Milk", alice.id);

    await expect(bobPage.getByText("Milk")).toBeVisible({ timeout: 5000 });
  });

  test("item:updated — Bob's row reflects a cart-state cycle", async ({
    browser,
    request,
  }) => {
    const { alice, bob, list } = await setupAliceAndBob(request);
    const milk = await apiAddItem(request, list.id, "Milk", alice.id);
    await pageAsMember(browser, alice, list);
    const bobPage = await pageAsMember(browser, bob, list);

    await apiUpdateItem(request, milk.id, { cartState: "purchased" });

    await expect(
      bobPage.getByRole("button", { name: /purchased \(1\)/i }),
    ).toBeVisible({ timeout: 5000 });
    const milkRow = bobPage.getByRole("listitem").filter({ hasText: "Milk" });
    await expect(milkRow.getByText("Milk")).toHaveClass(/line-through/);
  });

  test("item:deleted — Bob's row drops when Alice deletes it", async ({
    browser,
    request,
  }) => {
    const { alice, bob, list } = await setupAliceAndBob(request);
    const milk = await apiAddItem(request, list.id, "Milk", alice.id);
    await pageAsMember(browser, alice, list);
    const bobPage = await pageAsMember(browser, bob, list);

    await expect(bobPage.getByText("Milk")).toBeVisible();

    const res = await request.delete(`/api/items/${milk.id}`);
    expect(res.ok()).toBeTruthy();

    await expect(bobPage.getByText("Milk")).toHaveCount(0, { timeout: 5000 });
  });

  test("member:joined — Carol joining bumps the member count for Alice and Bob", async ({
    browser,
    request,
  }) => {
    const { alice, bob, list } = await setupAliceAndBob(request);
    const alicePage = await pageAsMember(browser, alice, list);
    const bobPage = await pageAsMember(browser, bob, list);

    const carol = await apiCreateUser(request, "Carol");
    await apiAddMember(request, list.id, carol.id);

    await expect(
      alicePage.getByRole("button", { name: /view members/i }),
    ).toContainText("3 members", { timeout: 5000 });
    await expect(
      bobPage.getByRole("button", { name: /view members/i }),
    ).toContainText("3 members", { timeout: 5000 });
  });

  test("member:left — Bob leaving drops his avatar from Alice's cluster", async ({
    browser,
    request,
  }) => {
    const { alice, bob, list } = await setupAliceAndBob(request);
    const alicePage = await pageAsMember(browser, alice, list);
    await pageAsMember(browser, bob, list);

    const res = await request.delete(`/api/lists/${list.id}/members/${bob.id}`);
    expect(res.ok()).toBeTruthy();

    await expect(
      alicePage.getByRole("button", { name: /view members/i }),
    ).toContainText("1 member", { timeout: 5000 });
  });

  test("purchase:created — Bob's splits chip appears live", async ({
    browser,
    request,
  }) => {
    const { alice, bob, list } = await setupAliceAndBob(request);
    const milk = await apiAddItem(request, list.id, "Milk", alice.id);
    await pageAsMember(browser, alice, list);
    const bobPage = await pageAsMember(browser, bob, list);

    // No splits chip yet.
    await expect(
      bobPage.getByRole("button", { name: /view splits/i }),
    ).toHaveCount(0);

    await apiCreatePurchase(request, list.id, {
      payerUserId: alice.id,
      items: [{ itemId: milk.id, priceCents: 1000 }],
    });

    await expect(
      bobPage.getByRole("button", { name: /view splits \(\$10\.00 total\)/i }),
    ).toBeVisible({ timeout: 5000 });
  });
});
