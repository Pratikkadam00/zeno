import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetSnapshot } from "@zeno/shared";

// Flat payload the native home-screen widget / watch complication renders.
// Persisted under this key on every change; the native extension reads it from
// the shared App Group container (iOS) / SharedPreferences (Android) — see
// apps/mobile/widgets/README.md for the native bridge + build steps.
export const WIDGET_SNAPSHOT_KEY = "zeno.widget.snapshot.v1";

export type WidgetPayload = {
  monthlySpendLabel: string;
  activeCount: number;
  nextRenewalName: string | null;
  nextRenewalAmount: string | null;
  nextRenewalDaysUntil: number | null;
  watchComplicationText: string;
  generatedAt: string;
};

export function toWidgetPayload(snapshot: WidgetSnapshot): WidgetPayload {
  return {
    monthlySpendLabel: snapshot.monthlySpendLabel,
    activeCount: snapshot.activeCount,
    nextRenewalName: snapshot.nextRenewal?.name ?? null,
    nextRenewalAmount: snapshot.nextRenewal?.amountLabel ?? null,
    nextRenewalDaysUntil: snapshot.nextRenewal?.daysUntil ?? null,
    watchComplicationText: snapshot.watchComplicationText,
    generatedAt: snapshot.generatedAt
  };
}

// Best-effort: persist the latest snapshot for the native widget to read.
// Never throws — widget refresh must not affect the app.
export async function refreshWidgetSnapshot(snapshot: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(toWidgetPayload(snapshot)));
  } catch {
    // ignore
  }
}
