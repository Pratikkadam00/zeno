import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

// F105 (P3.7): the lock overlay is drawn ON TOP of the app, but the app stayed
// in the accessibility tree underneath it. On the emulator, with the app
// locked, the tree still held the whole ledger (77 labelled nodes, every
// amount), so a screen reader, or any app granted accessibility access, could
// read it through the lock. While `covered`, the content is removed from the
// tree: Android's "no-hide-descendants", iOS's accessibilityElementsHidden.
// It renders the same View either way, so the app's state is never remounted.
export function HiddenWhileLocked({ covered, children }: { covered: boolean; children: ReactNode }) {
  return (
    <View
      style={styles.fill}
      importantForAccessibility={covered ? "no-hide-descendants" : "auto"}
      accessibilityElementsHidden={covered}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
