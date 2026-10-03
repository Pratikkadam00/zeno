/**
 * "Today", for a product whose dates are calendar days.
 *
 * A renewal date is a day label: midnight UTC of the calendar day it names
 * (ENGINEERING_STANDARDS §10). It is not an instant, and "today" must be read
 * the same way: the user's own calendar date (what their clock shows), as a
 * label. Taking today's UTC day instead put a renewal a day early or late near
 * midnight (at 22:00 on Oct 6 in New York, the 7th's renewal read "today").
 * Day arithmetic between labels stays in UTC, where every day is 24 h.
 */
const DAY_MS = 86_400_000;

/** The user's calendar date (the device's clock) as a day label. */
export function todayLabel(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** The day label of a stored date: its UTC day. NaN for an unreadable value. */
export function dayLabelOf(value: Date | number | string): number {
  const d = new Date(value);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from the user's today to a stored date's day (negative = past; NaN if unreadable). */
export function daysFromToday(value: Date | number | string, now: Date = new Date()): number {
  return Math.round((dayLabelOf(value) - todayLabel(now)) / DAY_MS);
}

/** The user's current month (by their clock): the year and the 0-based month. */
export function currentMonth(now: Date = new Date()): { year: number; month: number } {
  return { year: now.getFullYear(), month: now.getMonth() };
}
