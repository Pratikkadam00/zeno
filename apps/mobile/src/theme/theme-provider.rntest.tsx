import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useZenoTheme, ZenoThemeProvider } from "./theme-provider";
import { zenoDark, zenoLight } from "./tokens";

/**
 * Theme provider: restoring the stored preference and colour scheme (current,
 * legacy-renamed, unknown, unreadable storage), migrating legacy ids, every
 * setter and what it persists, and the outside-the-provider guard.
 */
const wrapper = ({ children }: { children: ReactNode }) => <ZenoThemeProvider>{children}</ZenoThemeProvider>;
const THEME_KEY = "zeno.theme.preference.v2";
const SCHEME_KEY = "zeno.color.scheme.v1";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

async function mounted() {
  const r = renderHook(() => useZenoTheme(), { wrapper });
  await act(async () => {}); // let the two storage reads settle
  return r;
}

describe("restoring stored preferences", () => {
  it("defaults to millennial + light when nothing is stored", async () => {
    const { result } = await mounted();
    expect(result.current).toMatchObject({ themeId: "millennial", scheme: "light" });
    expect(result.current.theme).toBe(zenoLight);
  });

  it("restores a current id and a dark scheme", async () => {
    await AsyncStorage.multiSet([[THEME_KEY, "genx"], [SCHEME_KEY, "dark"]]);
    const { result } = await mounted();
    await waitFor(() => expect(result.current.scheme).toBe("dark"));
    expect(result.current.themeId).toBe("genx");
    expect(result.current.theme).toBe(zenoDark);
  });

  it("migrates a legacy id to its current name and rewrites storage", async () => {
    for (const [legacy, current] of [["pulse", "genz"], ["clarity", "millennial"], ["command", "genx"]] as const) {
      await AsyncStorage.clear();
      await AsyncStorage.setItem(THEME_KEY, legacy);
      const { result, unmount } = await mounted();
      await waitFor(() => expect(result.current.themeId).toBe(current));
      await waitFor(async () => expect(await AsyncStorage.getItem(THEME_KEY)).toBe(current));
      unmount();
    }
  });

  it("ignores an unknown stored id and an unknown scheme", async () => {
    await AsyncStorage.multiSet([[THEME_KEY, "neon"], [SCHEME_KEY, "sepia"]]);
    const { result } = await mounted();
    expect(result.current).toMatchObject({ themeId: "millennial", scheme: "light" });
    expect(await AsyncStorage.getItem(THEME_KEY)).toBe("neon"); // not rewritten
  });

  it("an unreadable store falls back to the defaults instead of crashing", async () => {
    // AsyncStorage's jest mock is already a jest.fn, so a permanent rejection
    // would leak into every later test (restoreAllMocks cannot undo it). Reject
    // exactly the provider's two reads, and nothing else.
    const err = new Error("storage unavailable");
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(err).mockRejectedValueOnce(err);
    const { result } = await mounted();
    expect(result.current).toMatchObject({ themeId: "millennial", scheme: "light" });
  });
});

describe("setters", () => {
  it("setScheme switches tokens and persists", async () => {
    const { result } = await mounted();
    act(() => result.current.setScheme("dark"));
    expect(result.current.theme).toBe(zenoDark);
    await waitFor(async () => expect(await AsyncStorage.getItem(SCHEME_KEY)).toBe("dark"));
  });

  it("toggleScheme flips both ways and persists each time", async () => {
    const { result } = await mounted();
    act(() => result.current.toggleScheme());
    expect(result.current.scheme).toBe("dark");
    await waitFor(async () => expect(await AsyncStorage.getItem(SCHEME_KEY)).toBe("dark"));
    act(() => result.current.toggleScheme());
    expect(result.current.scheme).toBe("light");
    await waitFor(async () => expect(await AsyncStorage.getItem(SCHEME_KEY)).toBe("light"));
  });

  it("setThemeId stores the id (kept for back-compat; the look does not change)", async () => {
    const { result } = await mounted();
    const before = result.current.theme;
    act(() => result.current.setThemeId("genz"));
    expect(result.current.themeId).toBe("genz");
    expect(result.current.theme).toBe(before);
    await waitFor(async () => expect(await AsyncStorage.getItem(THEME_KEY)).toBe("genz"));
  });
});

describe("resetPreferences (F27 erase)", () => {
  it("returns to the defaults and removes both stored keys", async () => {
    await AsyncStorage.multiSet([[THEME_KEY, "genx"], [SCHEME_KEY, "dark"]]);
    const { result } = await mounted();
    await waitFor(() => expect(result.current.scheme).toBe("dark"));
    await act(async () => { await result.current.resetPreferences(); });
    expect(result.current).toMatchObject({ themeId: "millennial", scheme: "light" });
    expect(result.current.theme).toBe(zenoLight);
    expect(await AsyncStorage.getItem(THEME_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(SCHEME_KEY)).toBeNull();
  });

  it("rejects when storage fails, so the erase can report it", async () => {
    const { result } = await mounted();
    jest.spyOn(AsyncStorage, "multiRemove").mockRejectedValueOnce(new Error("storage unavailable"));
    let rejected: unknown;
    await act(async () => { await result.current.resetPreferences().catch((e: unknown) => { rejected = e; }); });
    expect(rejected).toEqual(new Error("storage unavailable"));
  });
});

describe("guard", () => {
  it("useZenoTheme outside the provider throws a clear error", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useZenoTheme())).toThrow("useZenoTheme must be used inside ZenoThemeProvider");
  });
});
