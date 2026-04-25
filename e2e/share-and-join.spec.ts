import { test, expect } from "./fixtures.js";
import {
  apiAddMember,
  apiCreateList,
  apiCreateUser,
  pageAsMember,
  setSavedUser,
} from "./helpers/factories.js";

test.describe("share + join", () => {
  test("Share button writes a /join/<token> URL with the correct origin to the clipboard", async ({
    browser,
    request,
    baseURL,
  }) => {
    const context = await browser.newContext({
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();

    const alice = await apiCreateUser(request, "Alice");
    const list = await apiCreateList(request, "Trip");
    await apiAddMember(request, list.id, alice.id);

    await page.goto("/");
    await setSavedUser(page, alice);
    await page.goto(`/list/${list.id}`);

    await page.getByRole("button", { name: "Share list" }).click();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toMatch(new RegExp(`^${baseURL}/join/.+$`));
    expect(url).toContain(list.shareToken);
  });

  test("a brand-new user can join via the share link", async ({
    browser,
    request,
  }) => {
    const list = await apiCreateList(request, "Trip");

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/join/${list.shareToken}`);

    await expect(
      page.getByRole("heading", { name: /join "trip"/i }),
    ).toBeVisible();

    await page.locator("#user-name").fill("Bob");
    await page.getByRole("button", { name: /^join list$/i }).click();
    await page.waitForURL(/\/list\/\d+/);
    await expect(page.getByRole("heading", { name: "Trip" })).toBeVisible();
  });

  test("a returning user with a saved identity sees a quick 'Join as <name>' button", async ({
    browser,
    request,
  }) => {
    const bob = await apiCreateUser(request, "Bob");
    const list = await apiCreateList(request, "Trip");

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/");
    await setSavedUser(page, bob);
    await page.goto(`/join/${list.shareToken}`);

    const rejoin = page.getByRole("button", { name: /^join as bob$/i });
    await expect(rejoin).toBeVisible();
    await rejoin.click();

    await page.waitForURL(/\/list\/\d+/);
    await expect(page.getByRole("heading", { name: "Trip" })).toBeVisible();
  });

  test("a user who's already a member is auto-redirected with replace:true", async ({
    browser,
    request,
  }) => {
    const alice = await apiCreateUser(request, "Alice");
    const list = await apiCreateList(request, "Trip");
    await apiAddMember(request, list.id, alice.id);

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/"); // entry: home
    await setSavedUser(page, alice);
    await page.goto(`/join/${list.shareToken}`);

    // Auto-redirect to /list/:id.
    await page.waitForURL(new RegExp(`/list/${list.id}$`));
    await expect(page.getByRole("heading", { name: "Trip" })).toBeVisible();

    // Going back should skip the /join page (replace:true) and land at /.
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });
});
