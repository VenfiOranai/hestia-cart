import { test, expect } from "./fixtures.js";

/**
 * Full-stack happy path: two users on separate browser contexts share a list,
 * add items, record a purchase, and see the splits update (via the WebSocket
 * event stream for Bob's view).
 */
test("two users share a list, add items, and split a purchase", async ({
  browser,
}) => {
  const alice = await browser.newContext();
  await alice.grantPermissions(["clipboard-read", "clipboard-write"]);
  const alicePage = await alice.newPage();

  // --- Alice creates an identity ---
  await alicePage.goto("/");
  await alicePage.getByPlaceholder("Your name").fill("Alice");
  await alicePage.getByRole("button", { name: /^log in$/i }).click();
  // The "Log out" button only shows once the identity card has rendered.
  await expect(alicePage.getByRole("button", { name: /log out/i })).toBeVisible();

  // --- Alice creates a list ---
  await alicePage.getByPlaceholder(/weekly groceries/i).fill("Weekend trip");
  await alicePage.getByRole("button", { name: /^create$/i }).click();

  await alicePage.waitForURL(/\/list\/\d+/);
  await expect(
    alicePage.getByRole("heading", { name: "Weekend trip" }),
  ).toBeVisible();

  // --- Alice copies the share URL via the Share list button ---
  await alicePage.getByRole("button", { name: "Share list" }).click();
  const shareUrl: string = await alicePage.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(shareUrl).toContain("/join/");

  // --- Bob joins via the share link in a separate browser context ---
  const bob = await browser.newContext();
  const bobPage = await bob.newPage();
  const joinPath = new URL(shareUrl).pathname;
  await bobPage.goto(joinPath);

  await expect(
    bobPage.getByRole("heading", { name: /join "weekend trip"/i }),
  ).toBeVisible();
  await bobPage.locator("#user-name").fill("Bob");
  await bobPage.getByRole("button", { name: /^join list$/i }).click();
  await bobPage.waitForURL(/\/list\/\d+/);

  await expect(
    bobPage.getByRole("heading", { name: "Weekend trip" }),
  ).toBeVisible();

  // --- Alice adds an item; Bob sees it live via the WebSocket ---
  await alicePage.getByPlaceholder(/add an item/i).fill("Milk");
  await alicePage.getByRole("button", { name: /^add$/i }).click();
  await expect(alicePage.getByText("Milk")).toBeVisible();
  await expect(bobPage.getByText("Milk")).toBeVisible({ timeout: 5000 });

  // --- Alice records a purchase for Milk, $5.00 ---
  await alicePage.getByRole("button", { name: "Record Purchase" }).click();

  const modal = alicePage.getByRole("heading", { name: "Record Purchase" }).locator("../..");

  // Milk isn't pre-selected (its cartState is "needed"), so check the box first.
  const milkRow = modal.getByRole("listitem").filter({ hasText: "Milk" });
  await milkRow.getByRole("checkbox").check();
  await milkRow.getByPlaceholder("0.00").fill("5.00");

  await modal.getByRole("button", { name: "Record Purchase" }).click();

  // --- Splits chip appears in the header; tap it to open the modal ---
  const splitsChip = alicePage.getByRole("button", {
    name: /view splits \(\$5\.00 total\)/i,
  });
  await expect(splitsChip).toBeVisible({ timeout: 5000 });
  await splitsChip.click();

  await expect(
    alicePage.getByRole("heading", { name: "Cost Splitting" }),
  ).toBeVisible();
  await expect(alicePage.getByText("$2.50")).toBeVisible();
});
