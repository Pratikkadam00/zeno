/**
 * A typed "YYYY-MM-DD" that names a REAL calendar day.
 *
 * `Date.parse` is lenient (F21): "2026-02-30" parses as 2 March and
 * "2026-04-31" as 1 May (measured with Node), so a date field validated only by
 * "did it parse" silently saves a different day than the one typed (F115).
 * A day is real only when it survives the round trip unchanged.
 */
export function isIsoDay(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}
