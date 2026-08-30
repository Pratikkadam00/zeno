/* Setup for the RN component-test project (see jest.config.js).
   Mocks the native-only modules our components touch, so a component test
   exercises OUR render logic rather than native bridges. */

// Reanimated works here via the worklets jest resolver (see jest.config.js),
// which loads the non-native implementation — so no reanimated mock is needed.

// AsyncStorage is a native module; the package ships an in-memory jest mock.
// ZenoThemeProvider reads the persisted theme/scheme through it on mount.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// expo-haptics has no JS fallback off-device; our haptics layer is fire-and-forget.
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" }
}));

// useReducedMotion() calls AccessibilityInfo.isReduceMotionEnabled() and sets
// state when the promise resolves. Un-mocked that lands outside act() and prints
// a warning on every render test. Spying on the REAL react-native export (rather
// than replacing the internal module, which breaks the export entirely) resolves
// it synchronously with motion enabled — the default — leaving behaviour intact.
const RN = require("react-native");
jest.spyOn(RN.AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
jest.spyOn(RN.AccessibilityInfo, "addEventListener").mockReturnValue({ remove: jest.fn() });
