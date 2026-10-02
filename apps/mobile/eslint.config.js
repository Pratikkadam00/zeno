// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/**"],
  },
  {
    // The RN component-test project (jest, see jest.config.js): its setup file
    // and specs use jest globals, which the app's default config doesn't declare.
    files: ["jest.setup.js", "jest.config.js", "**/*.rntest.tsx"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        require: "readonly",
        module: "writable"
      }
    }
  },
  {
    // Scoped to the same files eslint-config-expo registers the
    // @typescript-eslint plugin for, so this rule override can find it.
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Matches the underscore-prefix convention used monorepo-wide (see the
      // root eslint.config.mjs) for intentionally-unused args/vars.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
      ],
      // F159: a react-native Modal is its own window and stays above the app
      // lock. Every modal goes through AppModal, which hides while locked.
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "react-native", importNames: ["Modal"], message: "Use AppModal (src/security/AppModal.tsx): a raw Modal stays usable over the app lock (F159)." }] }
      ]
    }
  },
  {
    // Allowed a raw Modal: AppModal itself, the lock cover, and tests (which
    // find a Modal by its type to read what it shows).
    files: ["src/security/AppModal.tsx", "app/_layout.tsx", "**/*.rntest.tsx"],
    rules: { "no-restricted-imports": "off" }
  }
]);
