// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/**"],
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
      ]
    }
  }
]);
