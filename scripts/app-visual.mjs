#!/usr/bin/env node
// U2 · visual baselines for the APP (the website's are e2e/visual.spec.ts).
//
//   node scripts/app-visual.mjs --mode update     write the baselines
//   node scripts/app-visual.mjs --mode check      compare against them
//   node scripts/app-visual.mjs --mode check --scale 2.0
//
// A screenshot only means something if everything except the app is pinned, so
// before capturing this script:
//   - freezes the device clock, because the ledger prints today's date and the
//     renewal dates are relative to it (without this a baseline rots overnight);
//   - puts the status bar in SystemUI's demo mode (fixed clock, full battery,
//     full signal, no notification icons);
//   - sets the font scale it was asked for;
//   - drives the app's own Settings switch for dark mode, because the app reads
//     its scheme from its own storage, not from the system.
//
// Baselines are specific to ONE device: the same AVD, size, density and Android
// build. The fingerprint is written beside them and checked before any
// comparison, so running on a different device fails loudly instead of
// reporting hundreds of false differences.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADB = process.env.ADB_PATH ?? "C:/Users/Pratik/AppData/Local/Android/Sdk/platform-tools/adb.exe";
const SERIAL = process.env.ANDROID_SERIAL ?? "emulator-5554";
const PACKAGE = "app.zeno.mobile";
const BASE_DIR = join(ROOT, "apps/mobile/visual-baselines");

// The instant every capture pretends it is. Fixed so the ledger's "FRI, OCT 9",
// its renewal dates and the calendar's month never move under the baselines.
const FROZEN_MS = Date.UTC(2026, 9, 10, 6, 30, 0); // 2026-10-10 12:00 IST

// A pixel counts as different when any channel moves by more than this. Small
// but not zero: the emulator's GPU dithers gradients by a unit now and then.
const CHANNEL_TOLERANCE = 8;
// And the whole screen fails when more than this fraction of it differs.
const FAIL_FRACTION = 0.001; // 0.1 % of pixels

const sh = (...args) => execFileSync(ADB, ["-s", SERIAL, ...args], { encoding: "utf8", timeout: 60_000 });
const shell = (cmd) => sh("shell", cmd);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every screen worth a baseline, by the deep link that opens it. */
const SCREENS = [
  ["ledger", "zeno://dashboard"],
  ["subscriptions", "zeno://subscriptions"],
  ["calendar", "zeno://calendar"],
  ["insights", "zeno://analytics"],
  ["discover", "zeno://discover"],
  ["budget", "zeno://budget"],
  ["notifications", "zeno://notifications"],
  ["profile", "zeno://profile"],
  ["settings", "zeno://settings"],
  // No `security`: that screen sets FLAG_SECURE so a PIN can never be
  // screenshotted (U6.13 proves it), and screencap returns black. It also
  // leaves the flag on long enough to blacken whatever is captured next, so
  // it stays out of this list entirely rather than being skipped halfway.
  ["wrapped", "zeno://wrapped"],
  ["spend-twin", "zeno://spend-twin"],
  ["widgets", "zeno://widgets"],
  ["coach", "zeno://coach"],
  ["family", "zeno://family"],
  ["paywall", "zeno://paywall"],
  ["business", "zeno://business"],
  ["partners", "zeno://partners"],
  ["public-api", "zeno://public-api"],
  // A subscription's id is generated on the device, so there is no deep link to
  // write down: open the ledger and press its first row.
  ["subscription-detail", { via: "zeno://subscriptions", pressFirstRow: true }]
];

function fingerprint() {
  const get = (prop) => shell(`getprop ${prop}`).trim();
  const size = shell("wm size").trim();
  const density = shell("wm density").trim();
  return [
    `device=${get("ro.product.name")}`,
    `sdk=${get("ro.build.version.sdk")}`,
    `release=${get("ro.build.version.release")}`,
    size,
    density
  ].join("\n");
}

function demoStatusBar(on) {
  if (!on) {
    shell("am broadcast -a com.android.systemui.demo -e command exit");
    return;
  }
  shell("settings put global sysui_demo_allowed 1");
  const demo = (args) => shell(`am broadcast -a com.android.systemui.demo ${args}`);
  demo("-e command enter");
  demo("-e command clock -e hhmm 1000");
  demo("-e command battery -e level 100 -e plugged false");
  demo("-e command network -e wifi show -e level 4");
  demo("-e command network -e mobile show -e datatype none -e level 4");
  demo("-e command notifications -e visible false");
}

async function capture(file) {
  shell("screencap -p /sdcard/visual.png");
  sh("pull", "/sdcard/visual.png", file);
}

/** The app reads its scheme from its own storage, so the switch in Settings is
 *  the only honest way in. Returns once the screen has settled. */
async function setDarkMode(wantDark) {
  shell(`am start -W -a android.intent.action.VIEW -d "zeno://settings" ${PACKAGE}`);
  await sleep(1800);
  const dump = () => {
    shell("uiautomator dump --compressed /sdcard/ui.xml");
    sh("pull", "/sdcard/ui.xml", join(ROOT, ".visual-ui.xml"));
    return readFileSync(join(ROOT, ".visual-ui.xml"), "utf8");
  };
  // Only the SWITCH carries content-desc="Dark mode"; the row's label is a
  // TextView with the same words in `text`, so match the switch, not the label.
  const SWITCH = /<node[^>]*content-desc="Dark mode"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
  // Changing the font scale is a configuration change: Android restarts the
  // activity under us, so the first dump can catch a half-built screen.
  let xml = "";
  let match = null;
  for (let attempt = 0; attempt < 6 && !match; attempt += 1) {
    if (attempt > 0) {
      await sleep(1000);
      shell(`am start -W -a android.intent.action.VIEW -d "zeno://settings" ${PACKAGE}`);
      await sleep(1200);
    }
    xml = dump();
    match = SWITCH.exec(xml);
  }
  if (!match) throw new Error("Dark mode switch not found in Settings after 6 tries");
  const isOn = /content-desc="Dark mode"[^>]*checked="true"/.test(xml);
  if (isOn !== wantDark) {
    const [, x1, y1, x2, y2] = match.map(Number);
    shell(`input tap ${Math.round((x1 + x2) / 2)} ${Math.round((y1 + y2) / 2)}`);
    await sleep(1200);
  }
  rmSync(join(ROOT, ".visual-ui.xml"), { force: true });
}

/** Absolute per-channel difference, ignoring alpha. */
async function compare(aPath, bPath) {
  const [a, b] = await Promise.all([
    sharp(aPath).raw().toBuffer({ resolveWithObject: true }),
    sharp(bPath).raw().toBuffer({ resolveWithObject: true })
  ]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
    return { differing: Infinity, total: 1, reason: `size ${a.info.width}×${a.info.height} vs ${b.info.width}×${b.info.height}` };
  }
  const channels = a.info.channels;
  const total = a.info.width * a.info.height;
  let differing = 0;
  for (let i = 0; i < a.data.length; i += channels) {
    for (let c = 0; c < Math.min(channels, 3); c += 1) {
      if (Math.abs(a.data[i + c] - b.data[i + c]) > CHANNEL_TOLERANCE) {
        differing += 1;
        break;
      }
    }
  }
  return { differing, total };
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[args.indexOf("--mode") + 1] ?? "check";
  const scale = args.includes("--scale") ? args[args.indexOf("--scale") + 1] : "1.0";
  if (!["check", "update"].includes(mode)) throw new Error(`--mode must be check or update, got ${mode}`);

  const suffix = scale === "1.0" ? "" : `@${scale}`;
  const dir = join(BASE_DIR, `phone${suffix}`);
  const fpFile = join(BASE_DIR, "device.txt");
  const current = fingerprint();

  if (mode === "check") {
    if (!existsSync(fpFile)) throw new Error("no baselines yet: run with --mode update");
    const recorded = readFileSync(fpFile, "utf8").trim();
    if (recorded !== current) {
      console.error("These baselines were taken on a different device.\n--- baseline ---\n" + recorded + "\n--- this device ---\n" + current);
      process.exit(2);
    }
  } else {
    mkdirSync(BASE_DIR, { recursive: true });
    writeFileSync(fpFile, `${current}\n`, "utf8");
  }
  mkdirSync(dir, { recursive: true });

  const shotsDir = join(ROOT, ".visual-shots");
  rmSync(shotsDir, { recursive: true, force: true });
  mkdirSync(shotsDir, { recursive: true });

  console.log(`mode=${mode} scale=${scale} device=${SERIAL}`);
  shell("svc power stayon true");
  demoStatusBar(true);
  shell(`cmd alarm set-time ${FROZEN_MS}`);
  // A fresh install asks for notifications the first time the app opens, and
  // that dialog sits over whatever is captured next. Grant it up front so a
  // reinstall between runs cannot quietly poison a baseline.
  try {
    shell(`pm grant ${PACKAGE} android.permission.POST_NOTIFICATIONS`);
  } catch {
    // already granted, or an Android version that does not ask
  }
  await sleep(1000);

  const failures = [];
  let compared = 0;
  try {
    for (const theme of ["light", "dark"]) {
      // Toggle the theme at the normal font size: at scale 2.0 the Settings
      // list reflows and the switch falls below the fold, so reaching it would
      // mean scrolling a screen whose layout is the thing under test.
      shell("settings put system font_scale 1.0");
      await sleep(600);
      await setDarkMode(theme === "dark");
      shell(`settings put system font_scale ${scale}`);
      await sleep(1200);
      for (const [name, target] of SCREENS) {
        const link = typeof target === "string" ? target : target.via;
        shell(`am start -W -a android.intent.action.VIEW -d "${link}" ${PACKAGE}`);
        await sleep(1700); // entrance animations settle
        if (typeof target === "object" && target.pressFirstRow) {
          shell("uiautomator dump --compressed /sdcard/ui.xml");
          sh("pull", "/sdcard/ui.xml", join(ROOT, ".visual-ui.xml"));
          const xml = readFileSync(join(ROOT, ".visual-ui.xml"), "utf8");
          rmSync(join(ROOT, ".visual-ui.xml"), { force: true });
          const row = /<node[^>]*content-desc="[^"]*, next [^"]*"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xml);
          if (!row) throw new Error("no subscription row to open: the ledger needs at least one");
          const [, x1, y1, x2, y2] = row.map(Number);
          shell(`input tap ${Math.round((x1 + x2) / 2)} ${Math.round((y1 + y2) / 2)}`);
          await sleep(1700);
        }
        const shot = join(shotsDir, `${name}-${theme}.png`);
        await capture(shot);
        const baseline = join(dir, `${name}-${theme}.png`);
        if (mode === "update") {
          // Lossless, hardest compression: these are committed, so size
          // matters, but a palette would quantise the gradients and every
          // later comparison would be noise against a picture that was never
          // what the device drew.
          await sharp(shot).png({ palette: false, compressionLevel: 9, effort: 10 }).toFile(baseline);
          console.log(`  wrote ${name}-${theme}`);
        } else {
          if (!existsSync(baseline)) {
            failures.push(`${name}-${theme}: no baseline`);
            continue;
          }
          const { differing, total, reason } = await compare(baseline, shot);
          compared += 1;
          const fraction = differing / total;
          if (reason || fraction > FAIL_FRACTION) {
            failures.push(`${name}-${theme}: ${reason ?? `${(fraction * 100).toFixed(3)} % of pixels differ`}`);
            await sharp(shot).toFile(join(shotsDir, `FAILED-${name}-${theme}.png`));
          }
        }
      }
    }
  } finally {
    shell("settings put system font_scale 1.0");
    shell(`cmd alarm set-time ${Date.now()}`);
    demoStatusBar(false);
  }

  if (mode === "update") {
    const written = readdirSync(dir).filter((f) => f.endsWith(".png")).length;
    console.log(`\n${written} baselines in ${dir.replace(ROOT, ".")}`);
    return;
  }
  console.log(`\ncompared ${compared}`);
  if (failures.length) {
    console.error(`\n${failures.length} differ:`);
    for (const f of failures) console.error(`  ${f}`);
    console.error(`\nThe captures that differ are in ${shotsDir.replace(ROOT, ".")} as FAILED-*.png.`);
    console.error("If the change was deliberate, re-run with --mode update and commit the baselines in the same commit.");
    process.exit(1);
  }
  console.log("every screen matches its baseline.");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
