/**
 * A typed money amount: digits, optionally a point and at most 2 decimals
 * ("9", "9.", "9.99"); never empty. Shared by the add form and Discover's
 * edit sheet. `parseFloat` alone read "1,99" as 1, "9.99.9" as 9.99 and
 * "1e3" as 1000 (F113, F122).
 */
export function isAmountText(text: string): boolean {
  return /^\d+(\.\d{0,2})?$/.test(text.trim());
}
