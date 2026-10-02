/* Setup for the RN component-test project (see jest.config.js).
   Mocks the native-only modules our components touch, so a component test
   exercises OUR render logic rather than native bridges. */

// Reanimated works here via the worklets jest resolver (see jest.config.js),
// which loads the non-native implementation — so no reanimated mock is needed.

// Gesture Handler's own jest setup (its native module's install can't run here).
// LedgerSheet wraps its Modal content in GestureHandlerRootView (F162).
require("react-native-gesture-handler/jestSetup");

// react-native-quick-crypto is a native (JSI) module and can't load off-device.
// The app uses three of its exports (src/security/app-lock.ts), each a drop-in
// for Node's own: the same stand-in app-lock.test.ts and lock-store.test.ts use
// under vitest. Needed here since every modal (AppModal, F159/F162) reads the
// lock store, which imports app-lock.
jest.mock("react-native-quick-crypto", () => {
  const nodeCrypto = jest.requireActual("crypto");
  return { pbkdf2Sync: nodeCrypto.pbkdf2Sync, timingSafeEqual: nodeCrypto.timingSafeEqual, Buffer: jest.requireActual("buffer").Buffer };
});

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
