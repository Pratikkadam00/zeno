/**
 * Shared harness for the jest SCREEN tests (P3.8). Not a test file itself, and
 * outside every coverage scope (vitest excludes src/test-support/**, jest only
 * collects from app/ and the component trees).
 *
 * What is real: the theme provider, the subscription store and budget store
 * providers with all their hydration and aggregate logic, the bundled seed
 * data and the service catalog, the insights engine. What is faked, at the
 * module boundary only: SQLite (an in-memory key/value and row map), the FX
 * rate fetch, notifications, the router, and safe-area metrics.
 *
 * A test file wires the fakes (screen-fakes.ts) with, for example:
 *   jest.mock("../storage/database", () => require("../test-support/screen-fakes").fakeDatabaseModule);
 * (jest allows `require` inside a mock factory.)
 */
import { act, render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BudgetStoreProvider } from "../data/budget-store";
import { SubscriptionStoreProvider } from "../data/subscription-store";
import { ZenoThemeProvider } from "../theme/theme-provider";

export * from "./screen-fakes";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

/** Render a screen inside the app's real providers, after storage hydration has
 *  settled. With fake timers on (`jest.useFakeTimers()`), `settleMs` runs the
 *  entrance animations (the totals' count-up, springs) to the end inside act(),
 *  so no frame updates state after the test has moved on. */
export async function renderScreen(ui: ReactElement, { settleMs = 0 }: { settleMs?: number } = {}) {
  const result = render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ZenoThemeProvider>
        <SubscriptionStoreProvider>
          <BudgetStoreProvider>{ui}</BudgetStoreProvider>
        </SubscriptionStoreProvider>
      </ZenoThemeProvider>
    </SafeAreaProvider>
  );
  // Hydration is a chain of awaited fake reads; let it run to the end.
  for (let i = 0; i < 5; i += 1) await act(async () => {});
  if (settleMs > 0) {
    await act(async () => {
      jest.advanceTimersByTime(settleMs);
    });
  }
  return result;
}

type HostNode = { type: unknown; props: Record<string, unknown>; children: (HostNode | string)[] };

function textOf(node: HostNode | string): string {
  if (typeof node === "string") return node;
  return (node.children ?? []).map(textOf).join("");
}

/** Every element announced as a button, link, tab or switch must have a name:
 *  its accessibilityLabel, or else its visible text. Returns the offenders. */
export function unnamedControls(root: HostNode): string[] {
  const offenders: string[] = [];
  const walk = (node: HostNode | string) => {
    if (typeof node === "string") return;
    const role = node.props.accessibilityRole ?? node.props.role;
    if (typeof node.type === "string" && ["button", "link", "tab", "switch"].includes(String(role))) {
      const label = node.props.accessibilityLabel;
      if (!(typeof label === "string" && label.trim()) && !textOf(node).trim()) offenders.push(`${String(role)} with no name`);
    }
    (node.children ?? []).forEach(walk);
  };
  walk(root);
  return offenders;
}
