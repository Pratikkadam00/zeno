module.exports = function babelConfig(api) {
  // Keyed by the environment (not cached forever), because the plugin list
  // below differs between development and production.
  const env = process.env.BABEL_ENV || process.env.NODE_ENV || "development";
  api.cache.using(() => env);
  const plugins = [];
  if (env === "production") {
    // P3.2: release builds drop console.log/info/debug/trace, including what
    // bundled libraries print (RevenueCat forwards its SDK log here). warn and
    // error stay: they are the app's own diagnostics (19 call sites, each a
    // fixed message plus the caught error) and go through no user data.
    plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
  }
  // Must stay last (react-native-reanimated's requirement).
  plugins.push("react-native-reanimated/plugin");
  return {
    presets: ["babel-preset-expo"],
    plugins
  };
};
