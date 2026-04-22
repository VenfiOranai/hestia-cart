import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Clear any rendered components + the DOM between tests.
afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
