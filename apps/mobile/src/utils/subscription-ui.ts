import type { BillingCycle } from "@subradar/shared";
import type { ThemeTokens } from "../theme/tokens";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Advance a renewal date to its next future occurrence for recurring cycles.
 * A stored date that has already passed (e.g. an imported "last charged + 1
 * cycle" that is now overdue) rolls forward by whole cycles until it's today
 * or later, month-end-clamped (Jan 31 monthly → Feb 28, not Mar 3). Trials and
 * unknown cycles are returned unchanged. Missing/invalid input passes through.
 */
export function rollRenewalForward(dateValue: string | undefined | null, cycle: BillingCycle, now: Date = new Date()): string | undefined {
  if (!dateValue) return dateValue ?? undefined;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  if (cycle === "trial" || cycle === "unknown") return dateValue;

  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  if (cycle === "weekly") {
    let stamp = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    let guard = 0;
    while (stamp < todayUTC && guard++ < 1000) stamp += 7 * DAY_MS;
    const rolled = new Date(stamp);
    return new Date(Date.UTC(rolled.getUTCFullYear(), rolled.getUTCMonth(), rolled.getUTCDate(), hours, minutes)).toISOString();
  }

  const step = cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
  const baseYear = date.getUTCFullYear();
  const baseMonth = date.getUTCMonth();
  const anchorDay = date.getUTCDate();
  const at = (monthsAhead: number) => {
    const total = baseMonth + monthsAhead;
    const year = baseYear + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return { year, month, day: Math.min(anchorDay, daysInMonth) };
  };

  let months = 0;
  let current = at(0);
  let guard = 0;
  while (Date.UTC(current.year, current.month, current.day) < todayUTC && guard++ < 1000) {
    months += step;
    current = at(months);
  }
  return new Date(Date.UTC(current.year, current.month, current.day, hours, minutes)).toISOString();
}

/**
 * Days until the given ISO date, clamped at 0. Returns null for missing or
 * invalid dates. Canonical version shared by dashboard, calendar, analytics
 * and subscription screens.
 */
export function getDaysRemaining(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const targetUTC = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  return Math.max(0, Math.ceil((targetUTC - todayUTC) / DAY_MS));
}

/** Short "Jun 12" style date. `fallback` is returned for missing/invalid dates. */
export function formatShortDate(dateValue?: string | null, fallback = "No date"): string {
  if (!dateValue) return fallback;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Alias kept for call sites that used the dashboard naming. */
export const formatRenewalDate = formatShortDate;

/** "Jun 2026" style month + year date. */
export function formatMonthYear(dateValue?: string | null, fallback = "—"): string {
  if (!dateValue) return fallback;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** Convert a #RRGGBB hex color to rgba() with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) {
    return hex;
  }
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

/**
 * Per-category identity accents. `dark` variants suit the dark themes
 * (genz/genx); `light` variants are deepened for the light millennial theme.
 */
const categoryAccents: Record<string, { dark: string; light: string }> = {
  entertainment: { dark: "#FF453A", light: "#DC2626" },
  streaming: { dark: "#FF453A", light: "#DC2626" },
  ai_tools: { dark: "#BF5AF2", light: "#7C3AED" },
  developer_tools: { dark: "#BF5AF2", light: "#7C3AED" },
  productivity: { dark: "#0A84FF", light: "#2563EB" },
  gaming: { dark: "#30D158", light: "#15803D" },
  family: { dark: "#30D158", light: "#15803D" },
  health: { dark: "#FF9F0A", light: "#D97706" },
  finance: { dark: "#5AC8F5", light: "#0284C7" },
  education: { dark: "#FFD60A", light: "#CA8A04" },
  music: { dark: "#FF375F", light: "#E11D48" }
};

/** Flat accent color for a category (charts, bars, dots). */
export function getCategoryColor(category: string, theme: ThemeTokens): string {
  const accent = categoryAccents[category];
  if (!accent) return theme.quietText;
  return theme.id === "millennial" ? accent.light : accent.dark;
}

/**
 * Avatar chip colors for a subscription category: a translucent surface plus
 * a readable accent for the initial. Falls back to neutral theme surfaces.
 */
export function getAvatarStyle(category: string, theme: ThemeTokens): { bg: string; text: string } {
  const accent = categoryAccents[category];
  if (!accent) return { bg: theme.surfaceAlt, text: theme.mutedText };
  const color = theme.id === "millennial" ? accent.light : accent.dark;
  return { bg: withAlpha(color, 0.15), text: color };
}

/** "TODAY" / "1 day" / "N days" — singular-aware label for a days count. */
export function formatDaysLabel(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "TODAY";
  return days === 1 ? "1 day" : `${days} days`;
}

/** Renewal-urgency badge colors and label for a days-remaining value. */
export function getUrgencyBadge(
  days: number | null,
  theme: ThemeTokens
): { bg: string; text: string; label: string } | null {
  if (days === null) return null;
  const label = formatDaysLabel(days);
  if (days <= 3) return { bg: theme.dangerSurface, text: theme.danger, label };
  if (days <= 7) return { bg: theme.warningSurface, text: theme.warning, label };
  return { bg: theme.surfaceAlt, text: theme.quietText, label };
}
