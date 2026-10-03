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
failed=0
for flow in "${flows[@]}"; do
  if "$maestro" --device "$device" test "$flow" > "${TMPDIR:-/tmp}/maestro-$(basename "$flow").log" 2>&1; then
    echo "PASS $(basename "$flow")"
  else
    echo "FAIL $(basename "$flow")"
    grep -E "FAILED|Assertion is" "${TMPDIR:-/tmp}/maestro-$(basename "$flow").log" | head -3
    failed=1
  fi
done
exit $failed
