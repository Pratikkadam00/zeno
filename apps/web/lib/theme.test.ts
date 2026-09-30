import { describe, expect, it } from "vitest";
import { THEME_SCRIPT, THEME_STORAGE_KEY } from "./theme";

/**
 * Runs the inline bootstrap exactly as the browser would, against a fake
 * document/localStorage/window, and reports the classes it applied.
 */
function boot(opts: { saved?: string | null; osDark?: boolean; storageThrows?: boolean }) {
  const classes = new Set<string>();
  const document = { documentElement: { classList: { add: (c: string) => classes.add(c) } } };
  const localStorage = {
    getItem: (key: string) => {
      if (opts.storageThrows) throw new Error("SecurityError: private mode");
      return key === THEME_STORAGE_KEY ? (opts.saved ?? null) : null;
    }
  };
  const window = { matchMedia: () => ({ matches: opts.osDark ?? false }) };
  new Function("document", "localStorage", "window", THEME_SCRIPT)(document, localStorage, window);
  return [...classes];
}

describe("theme bootstrap (paper is the default)", () => {
  it("first visit on an OS set to dark still paints PAPER (the design is paper-only)", () => {
    expect(boot({ saved: null, osDark: true })).toEqual(["js"]);
  });

  it("first visit on an OS set to light paints paper", () => {
    expect(boot({ saved: null, osDark: false })).toEqual(["js"]);
  });

  it("a visitor who chose dark with the toggle gets dark back before first paint", () => {
    expect(boot({ saved: "dark", osDark: false })).toEqual(["js", "dark"]);
  });

  it("a visitor who chose light stays on paper even when the OS is dark", () => {
    expect(boot({ saved: "light", osDark: true })).toEqual(["js"]);
  });

  it("still arms html.js when storage is unavailable (private mode), and never throws", () => {
    expect(boot({ storageThrows: true, osDark: true })).toEqual(["js"]);
  });

  it("never consults the OS preference (no matchMedia in the script)", () => {
    expect(THEME_SCRIPT).not.toMatch(/matchMedia|prefers-color-scheme/);
  });
});
