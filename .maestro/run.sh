#!/usr/bin/env bash
# Run the Maestro flows against the installed release APK on one device.
#   .maestro/run.sh [device] [flow.yaml ...]   (default: emulator-5554, every numbered flow)
# Pushes the fixtures the flows read, turns Maestro's analytics off, and runs
# each flow on its own so one failure doesn't hide the rest; exits 1 if any failed.
set -uo pipefail
export MSYS_NO_PATHCONV=1 MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=1
here="$(cd "$(dirname "$0")" && pwd)"
device="${1:-emulator-5554}"
shift || true
adb="${ADB:-adb}"
maestro="${MAESTRO:-maestro}"

fixture="$here/fixtures/statement.csv"
# Windows' adb.exe needs a Windows path (Git Bash's path conversion is off above).
command -v cygpath > /dev/null && fixture="$(cygpath -w "$fixture")"
"$adb" -s "$device" push "$fixture" /sdcard/Download/zeno-statement.csv > /dev/null || { echo "could not push the CSV fixture"; exit 1; }
"$adb" -s "$device" shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Download/zeno-statement.csv > /dev/null

flows=("$@")
[ ${#flows[@]} -eq 0 ] && flows=("$here"/[0-9][0-9]-*.yaml)
helper="$here/screen_texts.py"
# Windows' Python and Maestro's Java need Windows paths (path conversion is off above).
winpath() { if command -v cygpath > /dev/null; then cygpath -w "$1"; else printf '%s' "$1"; fi; }
helper="$(winpath "$helper")"
failed=0
for flow in "${flows[@]}"; do
  name="$(basename "$flow")"
  log="${TMPDIR:-/tmp}/maestro-$name.log"
  # Each run's evidence (maestro.log, the saved screens) goes to a folder we name
  # (--debug-output), not one we have to find in the console output: on GitHub's
  # runner the console never named it (2026-10-04), so no screen was reported.
  dbg="${TMPDIR:-/tmp}/zeno-maestro-debug/${name%.yaml}"
  run_flow() {
    rm -rf "$dbg"; mkdir -p "$dbg"
    "$adb" -s "$device" logcat -b crash -c > /dev/null 2>&1
    "$maestro" --device "$device" test --debug-output "$(winpath "$dbg")" "$flow" > "$log" 2>&1
  }
  run_flow
  rc=$?
  # Retry once ONLY when Maestro's own device server died and the app did not
  # crash (its crash log is empty): a tooling hiccup, measured twice in P5. An
  # app crash is never retried away. The console log doesn't always say so; the
  # run's own maestro.log does: on 2026-10-04 a run died on "device offline"
  # with only that file saying why.
  tooling_died() {
    grep -qE "DeviceServerDiedException|device offline" "$log" && return 0
    grep -rqsE "DeviceServerDiedException|device offline" --include=maestro.log "$dbg"
  }
  # Up to two retries: on GitHub's runner the server died on the retry too
  # (flow 11, 2026-10-04), and a second death is still not the app's fault.
  for attempt in 1 2; do
    if [ $rc -ne 0 ] && tooling_died && ! "$adb" -s "$device" logcat -d -b crash | grep -q "FATAL EXCEPTION"; then
      echo "RETRY $name (Maestro's device server died; no app crash; retry $attempt)"
      run_flow
      rc=$?
    fi
  done
  if [ $rc -eq 0 ]; then
    echo "PASS $name"
  else
    echo "FAIL $name"
    grep -E "FAILED|Assertion is|Exception" "$log" | head -4
    # What the screen showed at the failure (texts and labels), so a CI summary
    # says why, not only where.
    for py in python3 python; do
      screen="$("$py" "$helper" "$(winpath "$dbg")" 2>/dev/null)" && { echo "  SCREEN: $screen"; break; }
    done
    "$adb" -s "$device" logcat -d -b crash | grep -m1 -A2 "FATAL EXCEPTION"
    failed=1
  fi
done
exit $failed
