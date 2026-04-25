import { test, expect } from "./fixtures.js";
import {
  apiAddMember,
  apiCreateList,
  apiCreateUser,
  seedListWithMembers,
  setSavedUser,
} from "./helpers/factories.js";

test.describe("members", () => {
  test("the header avatar cluster shows the first 4 + an overflow chip", async ({
    page,
    request,
  }) => {
    // 6 members → 4 visible avatars + a "+2" overflow chip.
    const { list } = await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob", "Carol", "Dave", "Eve", "Frank"],
      listName: "Trip",
    });
    void list;

    const cluster = page.getByRole("button", { name: /view members/i });
    // 4 named-avatars + 1 overflow chip = 5 rounded spans inside the cluster.
    await expect(cluster.locator("span.rounded-full")).toHaveCount(5);
    await expect(cluster).toContainText("+2");
    await expect(cluster).toContainText("6 members");
  });

  test("opening MembersModal lists every member with the current user marked '(you)'", async ({
    page,
    request,
  }) => {
    await seedListWithMembers(page, request, {
      ownerName: "Alice",
      otherNames: ["Bob", "Carol"],
      listName: "Trip",
    });

    await page.getByRole("button", { name: /view members/i }).click();

    const modal = page
      .getByRole("heading", { name: "Members" })
      .locator("../..");
    await expect(modal.getByRole("listitem")).toHaveCount(3);
    await expect(
      modal.getByRole("listitem").filter({ hasText: "Alice" }),
    ).toContainText("(you)");
    await expect(
      modal.getByRole("listitem").filter({ hasText: "Bob" }),
    ).not.toContainText("(you)");
  });

  test("Leave list: confirm dialog → user is navigated home and the list disappears from My Lists", async ({
    browser,
    request,
  }) => {
    const alice = await apiCreateUser(request, "Alice");
    const bob = await apiCreateUser(request, "Bob");
    const list = await apiCreateList(request, "Trip");
    await apiAddMember(request, list.id, alice.id);
    await apiAddMember(request, list.id, bob.id);

    // Drop Bob on the list page.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await setSavedUser(page, bob);
    await page.goto(`/list/${list.id}`);
    await expect(page.getByRole("heading", { name: "Trip" })).toBeVisible();

    await page.getByRole("button", { name: /view members/i }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /^leave list$/i }).click();

    await page.waitForURL(/\/$/);
    // Bob should no longer see Trip in his My Lists.
    await expect(page.getByRole("link", { name: /trip/i })).toHaveCount(0);

    // Server should also report Bob as no longer a member.
    const after = await request
      .get(`/api/users/${bob.id}/lists`)
      .then((r) => r.json());
    expect(after).toEqual([]);
  });
});
