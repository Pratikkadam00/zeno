import { useMemo } from "react";
import { useZenoTheme } from "./theme-provider";
import { zenoTokens, type ZenoTokens } from "./zeno";

/**
 * Full Zeno token bundle for the active color scheme — the preferred hook for
 * components (gives color scheme, palette, spacing, radius, fonts, type scale,
 * shadows and motion). Screens that only need legacy fields can still use
 * useZenoTheme().theme.
 */
export function useZenoTokens(): ZenoTokens {
  const { scheme } = useZenoTheme();
  return useMemo(() => zenoTokens(scheme), [scheme]);
}
