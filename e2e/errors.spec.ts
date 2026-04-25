import { test, expect } from "./fixtures.js";
import {
  apiAddMember,
  apiCreateList,
  apiCreateUser,
} from "./helpers/factories.js";

test.describe("error states", () => {
  test("navigating to a non-existent list ID renders the error block", async ({
    page,
  }) => {
    await page.goto("/list/999999");
    // ListPage renders <p className="text-red-600 font-medium">{err.message}</p>;
    // the server-side NotFoundError formats as "List 999999 not found".
    await expect(page.getByText(/list 999999 not found/i)).toBeVisible();
  });

  test("navigating to an invalid share token renders the invalid-link error", async ({
    page,
  }) => {
    await page.goto("/join/not-a-real-token");
    await expect(
      page.getByText(/this share link may be invalid or expired/i),
    ).toBeVisible();
  });

  test("direct navigation to /list/:id while logged out loads but disables the add bar", async ({
    page,
    request,
  }) => {
    const alice = await apiCreateUser(request, "Alice");
    const list = await apiCreateList(request, "Trip");
    await apiAddMember(request, list.id, alice.id);

    // Don't seed any user into localStorage.
    await page.goto(`/list/${list.id}`);

    await expect(page.getByRole("heading", { name: "Trip" })).toBeVisible();
    const addBar = page.getByPlaceholder("Join the list to add items");
    await expect(addBar).toBeVisible();
    await expect(addBar).toBeDisabled();
    // Record-Purchase button is gated on currentUserId, so it should be absent.
    await expect(
      page.getByRole("button", { name: "Record Purchase" }),
    ).toHaveCount(0);
  });
});
