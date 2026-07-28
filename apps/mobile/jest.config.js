/**
 * Isolated jest project for React Native COMPONENT tests (P5.1).
 *
 * Why a second runner: the repo's unit tests run under Vitest in a node
 * environment, where `react-native` itself cannot be parsed (it ships Flow
 * syntax) — every existing mobile unit test stubs it. Rendering real RN
 * components therefore needs jest with the expo preset's transform pipeline.
 *
 * The two runners are kept strictly disjoint by file extension: jest owns
 * `*.rntest.tsx`, Vitest owns `*.test.ts(x)`. Vitest's glob (`apps/**\/*.test.tsx`)
 * does not match `.rntest.tsx`, and vitest.config.ts excludes it explicitly as
 * belt-and-braces, so neither runner ever picks up the other's files.
 *
 * Run with: npm run test:rn --workspace @zeno/mobile
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/*.rntest.tsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Reanimated 4 runs on react-native-worklets, whose `.native` entry throws
  // under jest ("Native part of Worklets doesn't seem to be initialized").
  // The package ships this resolver to strip `.native` extensions so the
  // non-native implementation is loaded instead.
  resolver: "react-native-worklets/jest/resolver.js",
  // The expo preset already transforms the RN/expo module graph; this keeps
  // our own workspace packages transformed too.
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated|@gorhom/.*|@zeno/.*))"
  ]
};
