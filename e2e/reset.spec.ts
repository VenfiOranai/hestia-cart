import { test, expect } from "./fixtures.js";
import { apiCreateList, apiCreateUser } from "./helpers/factories.js";

/**
 * Regression coverage for the auto-reset fixture itself: two consecutive
 * tests each create a user + list, then assert the user has exactly one list.
 * Without `resetDb` running between them the second test would see two
 * lists and fail.
 */
test.describe("DB reset between tests", () => {
  test("first test creates a list and sees only that list", async ({
    request,
  }) => {
    const user = await apiCreateUser(request, "Isolation A");
    const list = await apiCreateList(request, "First");

    const res = await request.get(`/api/users/${user.id}/lists`);
    expect(res.ok()).toBeTruthy();
    const lists = await res.json();
    expect(lists).toEqual([]);

    // Add the user to their list and verify they see exactly one.
    await request.post(`/api/lists/${list.id}/members`, {
      data: { userId: user.id },
    });
    const after = await request.get(`/api/users/${user.id}/lists`);
    const listsAfter = await after.json();
    expect(listsAfter).toHaveLength(1);
  });

  test("second test starts from an empty DB", async ({ request }) => {
    // Fresh user; if reset didn't fire we'd already have rows from the previous test.
    const user = await apiCreateUser(request, "Isolation B");
    const res = await request.get(`/api/users/${user.id}/lists`);
    const lists = await res.json();
    expect(lists).toEqual([]);
  });
});
