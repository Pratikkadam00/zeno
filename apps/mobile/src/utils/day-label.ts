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
 * The day label `days` after today. "Today" is the UTC day, as everywhere else
 * in the app today (countdowns, the calendar's groups); whether it should be
 * the user's local day is an open product-wide question (OPEN_ITEMS, P5).
 */
export function dayLabelInDays(days: number, now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}
