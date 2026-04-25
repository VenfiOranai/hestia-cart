import type { Page } from "@playwright/test";

/**
 * Shared role/text-based locators for the bits of UI used across many specs.
 * Centralized so a wording change only updates one place.
 */

// --- Home / identity ---
export const loginNameInput = (page: Page) => page.getByPlaceholder("Your name");
export const loginButton = (page: Page) =>
  page.getByRole("button", { name: /^log in$/i });
export const logoutButton = (page: Page) =>
  page.getByRole("button", { name: /log out/i });
export const listNameInput = (page: Page) =>
  page.getByPlaceholder(/weekly groceries/i);
export const createListButton = (page: Page) =>
  page.getByRole("button", { name: /^create$/i });

// --- List page ---
export const shareButton = (page: Page) =>
  page.getByRole("button", { name: "Share list" });
export const addItemInput = (page: Page) =>
  page.getByPlaceholder(/add an item/i);
export const addItemButton = (page: Page) =>
  page.getByRole("button", { name: /^add$/i });
export const recordPurchaseButton = (page: Page) =>
  page.getByRole("button", { name: "Record Purchase" });
export const splitsChip = (page: Page) =>
  page.getByRole("button", { name: /view splits/i });
export const membersButton = (page: Page) =>
  page.getByRole("button", { name: /view members/i });

// --- Join page ---
export const joinNameInput = (page: Page) => page.locator("#user-name");
export const joinNewButton = (page: Page) =>
  page.getByRole("button", { name: /^join list$/i });
