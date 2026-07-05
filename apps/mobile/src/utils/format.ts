import { formatMoneyMinor, type RenewalReminderKind } from "@zeno/shared";

export function formatMoney(amountMinor: number, currency = "USD"): string {
  return formatMoneyMinor(amountMinor, currency);
}

// Just the currency mark (e.g. "$", "₹", "€") for UI that shows an amount as a
// live-editable field with a separate currency prefix, rather than one
// formatted string. narrowSymbol means CAD/AUD render as "$" like USD — the
// common, expected short form, not a disambiguated "CA$"/"A$".
export function currencySymbol(currency = "USD"): string {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol"
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

export function notificationLabel(kind: RenewalReminderKind): string {
  if (kind === "seven_day") {
    return "7-day";
  }
  if (kind === "three_day") {
    return "3-day cancel";
  }
  return "Day-of";
}
