import { todayLabel } from "@zeno/shared";

// Renewal dates are calendar-day labels, stored as midnight UTC of that day
// (ENGINEERING_STANDARDS §10): a CSV's "2026-10-07" is 2026-10-07T00:00:00Z.
// They must be SHOWN as that same day. Formatting one in the phone's timezone
// shows midnight UTC as the evening before anywhere west of UTC, so every
// imported renewal read a day early across the Americas (F182).

/** A day label formatted as the day it names, in any timezone. */
export function formatDayLabel(value: Date | number | string, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(undefined, { ...options, timeZone: "UTC" });
}

/**
 * The day label `days` after today, where "today" is the user's calendar date
 * (the shared todayLabel; "which today?", P5): "in 30 days" from Oct 6 in New
 * York is Nov 5, even at 22:00 there (already Oct 7 in UTC).
 */
export function dayLabelInDays(days: number, now: Date = new Date()): Date {
  const today = new Date(todayLabel(now));
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days));
}
