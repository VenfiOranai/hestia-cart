import { expect, type APIRequestContext, type Page } from "@playwright/test";
import {
  addItemButton,
  addItemInput,
  createListButton,
  joinNameInput,
  joinNewButton,
  listNameInput,
  loginButton,
  loginNameInput,
} from "./selectors.js";

const DEFAULT_COLOR = "#4f46e5";

// Minimal duplicates of the `shared` package types — kept inline so the e2e
// directory doesn't have to resolve into the workspace.
interface User {
  id: number;
  name: string;
  color: string;
  createdAt: string;
}
interface List {
  id: number;
  name: string;
  shareToken: string;
}
interface ListMember {
  id: number;
  userId: number;
  listId: number;
}
interface Item {
  id: number;
  listId: number;
  name: string;
}

// =========================================================================
// UI factories — drive the actual user flow. Use these when the journey
// (login form, join form, etc.) is part of what you're testing.
// =========================================================================

/** Log in via the home-page identity form. Leaves the page on `/`. */
export async function loginAs(
  page: Page,
  name: string,
  _color?: string,
): Promise<void> {
  await page.goto("/");
  await loginNameInput(page).fill(name);
  // Color picker selection isn't currently exposed via a stable test hook for
  // arbitrary hex values; the default indigo swatch is pre-selected. Specs
  // that need a non-default color can click the swatch directly.
  await loginButton(page).click();
  await expect(
    page.getByRole("button", { name: /log out/i }),
  ).toBeVisible();
}

/** Create a list from the home page. Assumes the user is already logged in.
 *  Waits until the list page has loaded. */
export async function createListUI(page: Page, name: string): Promise<void> {
  await listNameInput(page).fill(name);
  await createListButton(page).click();
  await page.waitForURL(/\/list\/\d+/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

/** Join an existing list as a brand-new user via the share link.
 *  Leaves the page on the list view. */
export async function joinAsNewUser(
  page: Page,
  shareLink: string,
  name: string,
): Promise<void> {
  const joinPath = new URL(shareLink).pathname;
  await page.goto(joinPath);
  await joinNameInput(page).fill(name);
  await joinNewButton(page).click();
  await page.waitForURL(/\/list\/\d+/);
}

/** Add an item via the bottom add-item form. */
export async function addItemUI(page: Page, name: string): Promise<void> {
  await addItemInput(page).fill(name);
  await addItemButton(page).click();
}

// =========================================================================
// API factories — seed state directly through the HTTP API. Use these when
// the setup is *not* the thing under test (e.g. "give Alice's list 3
// members already" before a checkout test).
//
// All routed through the Vite proxy at `/api/*`.
// =========================================================================

export async function apiCreateUser(
  request: APIRequestContext,
  name: string,
  color: string = DEFAULT_COLOR,
): Promise<User> {
  const res = await request.post("/api/users", { data: { name, color } });
  expect(res.ok(), `apiCreateUser ${name} failed: ${res.status()}`).toBeTruthy();
  return res.json();
}

export async function apiCreateList(
  request: APIRequestContext,
  name: string,
): Promise<List> {
  const res = await request.post("/api/lists", { data: { name } });
  expect(res.ok(), `apiCreateList ${name} failed: ${res.status()}`).toBeTruthy();
  return res.json();
}

export async function apiAddMember(
  request: APIRequestContext,
  listId: number,
  userId: number,
): Promise<ListMember> {
  const res = await request.post(`/api/lists/${listId}/members`, {
    data: { userId },
  });
  expect(
    res.ok(),
    `apiAddMember user=${userId} list=${listId} failed: ${res.status()}`,
  ).toBeTruthy();
  return res.json();
}

export async function apiAddItem(
  request: APIRequestContext,
  listId: number,
  name: string,
  createdByUserId: number,
): Promise<Item> {
  const res = await request.post(`/api/lists/${listId}/items`, {
    data: { name, createdByUserId },
  });
  expect(
    res.ok(),
    `apiAddItem ${name} on list ${listId} failed: ${res.status()}`,
  ).toBeTruthy();
  return res.json();
}

/** Write a saved-user blob to localStorage so the page treats this user as
 *  logged in without going through the UI login flow. Must be called after
 *  navigating to the app origin (otherwise localStorage is scoped to about:blank). */
export async function setSavedUser(page: Page, user: User): Promise<void> {
  await page.evaluate((u) => {
    localStorage.setItem("hestia-user", JSON.stringify(u));
  }, user);
}
