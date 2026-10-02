import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { installBrowserFakes, resetBrowserFakes } from "./browser";

// jsdom has no matchMedia, IntersectionObserver or Element.animate. The fakes
// are controllable per test (test-support/browser.ts); every test starts from
// the same defaults.
const browser = typeof window !== "undefined";
if (browser) installBrowserFakes();

afterEach(() => {
  // A spy left on window (e.g. requestAnimationFrame) would outlive its fake
  // clock and silently swallow the next test's frames.
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  if (!browser) return;
  cleanup();
  resetBrowserFakes();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  window.history.replaceState(null, "", "/");
  localStorage.clear();
});
