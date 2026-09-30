import { beforeEach, describe, expect, it, vi } from "vitest";
import { fonts } from "./zeno";

/**
 * fonts.ts: loads the three Zeno typefaces through expo-font. The contract its
 * comment states, and that every `fontFamily: fonts.*` in the app relies on:
 * the keys handed to useFonts ARE the family strings in zeno.ts `fonts`, and
 * each key is bound to the same-named asset export of its @expo-google-fonts
 * package. If a key and a constant drift apart, text silently falls back to
 * the system font. Also pinned: the { loaded, error } shape the root layout
 * reads to hide the splash (on load OR on failure, falling back to system fonts).
 *
 * The font packages export require()'d .ttf assets, which node cannot load,
 * so each is replaced by distinct numeric asset ids (what Metro's require()
 * of an asset returns on device).
 */
const useFonts = vi.hoisted(() => vi.fn<(map: Record<string, unknown>) => [boolean, Error | null]>());
vi.mock("expo-font", () => ({ useFonts: (map: Record<string, unknown>) => useFonts(map) }));
vi.mock("@expo-google-fonts/space-grotesk", () => ({
  SpaceGrotesk_500Medium: 101,
  SpaceGrotesk_600SemiBold: 102,
  SpaceGrotesk_700Bold: 103
}));
vi.mock("@expo-google-fonts/hanken-grotesk", () => ({
  HankenGrotesk_400Regular: 201,
  HankenGrotesk_500Medium: 202,
  HankenGrotesk_600SemiBold: 203,
  HankenGrotesk_700Bold: 204,
  HankenGrotesk_800ExtraBold: 205
}));
vi.mock("@expo-google-fonts/jetbrains-mono", () => ({
  JetBrainsMono_400Regular: 301,
  JetBrainsMono_500Medium: 302,
  JetBrainsMono_600SemiBold: 303,
  JetBrainsMono_700Bold: 304
}));

const { useZenoFonts } = await import("./fonts");
const spaceGrotesk = await import("@expo-google-fonts/space-grotesk");
const hankenGrotesk = await import("@expo-google-fonts/hanken-grotesk");
const jetBrainsMono = await import("@expo-google-fonts/jetbrains-mono");

beforeEach(() => {
  useFonts.mockReset().mockReturnValue([false, null]);
});

describe("useZenoFonts", () => {
  it("requests exactly the families zeno.ts names, each bound to its own package asset", () => {
    useZenoFonts();
    expect(useFonts).toHaveBeenCalledTimes(1);
    const requested = useFonts.mock.calls[0]![0];

    const families = [fonts.display, fonts.sans, fonts.mono].flatMap((group) => Object.values(group));
    expect(Object.keys(requested).sort()).toEqual([...families].sort());

    const packages: Record<string, unknown> = { ...spaceGrotesk, ...hankenGrotesk, ...jetBrainsMono };
    for (const family of families) {
      expect(requested[family], family).toBe(packages[family]);
    }
    // Every asset is distinct: no family is accidentally bound to another's file.
    expect(new Set(Object.values(requested)).size).toBe(families.length);
  });

  it("each role group loads from the right typeface", () => {
    useZenoFonts();
    const requested = useFonts.mock.calls[0]![0];
    for (const family of Object.values(fonts.display)) expect(requested[family]).toBe((spaceGrotesk as Record<string, unknown>)[family]);
    for (const family of Object.values(fonts.sans)) expect(requested[family]).toBe((hankenGrotesk as Record<string, unknown>)[family]);
    for (const family of Object.values(fonts.mono)) expect(requested[family]).toBe((jetBrainsMono as Record<string, unknown>)[family]);
  });

  it("reports loading, then loaded, with no error", () => {
    useFonts.mockReturnValueOnce([false, null]).mockReturnValueOnce([true, null]);
    expect(useZenoFonts()).toEqual({ loaded: false, error: null });
    expect(useZenoFonts()).toEqual({ loaded: true, error: null });
  });

  it("passes a load failure through unchanged, so the caller can still render with system fonts", () => {
    const failure = new Error("File not found: HankenGrotesk_400Regular");
    useFonts.mockReturnValueOnce([false, failure]);
    const result = useZenoFonts();
    expect(result.loaded).toBe(false);
    expect(result.error).toBe(failure);
  });
});
