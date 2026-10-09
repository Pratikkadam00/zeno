// U6.5, task hijacking (the StrandHogg family). An activity whose taskAffinity
// is the default, the package name, can be joined by another app's activity
// that declares the same affinity: that activity then sits on top of Zeno's
// task and is what the user sees when they return to Zeno, dressed as a Zeno
// screen. An EMPTY affinity means no other app's activity can share the task
// (OWASP MASTG, "Testing for Task Hijacking"). The prebuild template sets
// launchMode="singleTask" but leaves the affinity at its default, so this plugin
// sets it on the main activity at every prebuild. Proof: the packaged release
// manifest and `aapt2 dump xmltree` on the APK (docs/ui-evidence, U6.5).
const { withAndroidManifest } = require("expo/config-plugins");

function setMainActivityTaskAffinity(manifest) {
  const application = manifest.manifest.application?.[0];
  const main = application?.activity?.find((activity) => activity.$["android:name"] === ".MainActivity");
  if (!main) {
    throw new Error("withTaskAffinity: .MainActivity is not in the Android manifest");
  }
  main.$["android:taskAffinity"] = "";
  return manifest;
}

function withTaskAffinity(config) {
  return withAndroidManifest(config, (mod) => {
    mod.modResults = setMainActivityTaskAffinity(mod.modResults);
    return mod;
  });
}

module.exports = withTaskAffinity;
module.exports.setMainActivityTaskAffinity = setMainActivityTaskAffinity;
