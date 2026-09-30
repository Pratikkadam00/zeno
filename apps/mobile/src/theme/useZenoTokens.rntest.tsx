import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useZenoTheme, ZenoThemeProvider } from "./theme-provider";
import { useZenoTokens } from "./useZenoTokens";
import { darkScheme, lightScheme, zenoTokens } from "./zeno";

/**
 * useZenoTokens(): the full token bundle for the provider's active colour
 * scheme. Pinned: it follows the scheme (including one restored from storage),
 * and it is memoised per scheme, so components that list the bundle as an
 * effect/memo dependency do not re-run on unrelated re-renders.
 */
const wrapper = ({ children }: { children: ReactNode }) => <ZenoThemeProvider>{children}</ZenoThemeProvider>;

function mount() {
  return renderHook(() => ({ tokens: useZenoTokens(), theme: useZenoTheme() }), { wrapper });
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

it("gives the light bundle by default", async () => {
  const { result } = mount();
  await act(async () => {});
  expect(result.current.tokens).toEqual(zenoTokens("light"));
  expect(result.current.tokens.color).toBe(lightScheme);
});

it("follows the provider's scheme when it changes", async () => {
  const { result } = mount();
  await act(async () => {});
  act(() => result.current.theme.setScheme("dark"));
  expect(result.current.tokens.scheme).toBe("dark");
  expect(result.current.tokens.color).toBe(darkScheme);
  act(() => result.current.theme.toggleScheme());
  expect(result.current.tokens.color).toBe(lightScheme);
});

it("picks up a dark scheme restored from storage", async () => {
  await AsyncStorage.setItem("zeno.color.scheme.v1", "dark");
  const { result } = mount();
  await act(async () => {});
  expect(result.current.tokens.color).toBe(darkScheme);
});

it("returns the same bundle across re-renders until the scheme changes", async () => {
  const { result, rerender } = mount();
  await act(async () => {});
  const first = result.current.tokens;

  rerender({});
  expect(result.current.tokens).toBe(first);

  // A provider update that is NOT a scheme change keeps the same bundle too.
  act(() => result.current.theme.setThemeId("genz"));
  expect(result.current.theme.themeId).toBe("genz");
  expect(result.current.tokens).toBe(first);

  act(() => result.current.theme.setScheme("dark"));
  expect(result.current.tokens).not.toBe(first);
});

it("outside the provider it fails loudly, like useZenoTheme", () => {
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() => renderHook(() => useZenoTokens())).toThrow("useZenoTheme must be used inside ZenoThemeProvider");
  } finally {
    errors.mockRestore();
  }
});
