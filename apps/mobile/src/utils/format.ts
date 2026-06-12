import { formatMoneyMinor, type RenewalReminderKind } from "@subradar/shared";

export function formatMoney(amountMinor: number, currency = "USD"): string {
  return formatMoneyMinor(amountMinor, currency);
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
