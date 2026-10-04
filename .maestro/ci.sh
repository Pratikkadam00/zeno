#!/usr/bin/env bash
# CI entry point (.github/workflows/mobile-e2e.yml): install the release APK on
# the booted emulator, run every Maestro flow, then the accessibility audit.
# Both always run; the exit code fails if either did.
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
apk="${1:?usage: ci.sh <apk> [device]}"
device="${2:-emulator-5554}"
adb="${ADB:-adb}"
"$adb" -s "$device" install -r "$apk" || exit 1
"$adb" -s "$device" shell svc power stayon true
out="${TMPDIR:-/tmp}/zeno-ci-summary.txt"
# The screen the flows run on (it decides what is visible without scrolling).
echo "screen: $("$adb" -s "$device" shell wm size | tr -d '\r' | tail -n1), $("$adb" -s "$device" shell wm density | tr -d '\r' | tail -n1)" | tee "$out"
bash "$here/run.sh" "$device" 2>&1 | tee -a "$out"; flows=${PIPESTATUS[0]}
bash "$here/a11y-audit.sh" "$device" 2>&1 | tee -a "$out"; audit=${PIPESTATUS[0]}
echo "flows exit $flows, accessibility audit exit $audit"
# The job log and the uploaded logs need a login to read; an annotation doesn't.
# So the run's own summary (PASS/FAIL/RETRY per flow, each failure's assertion
# and any crash line, then the audit's result) becomes one, on failure only.
if [ "${GITHUB_ACTIONS:-}" = "true" ] && { [ $flows -ne 0 ] || [ $audit -ne 0 ]; }; then
  msg=$({ echo "flows exit $flows, accessibility audit exit $audit"; grep -v "a11y.xml: 1 file pulled" "$out" | tail -n 200; } | sed -e 's/%/%25/g' -e 's/\r/%0D/g' | awk 'BEGIN{ORS="%0A"} {print}')
  echo "::error title=Maestro flows and audit::${msg}"
fi
[ $flows -eq 0 ] && [ $audit -eq 0 ]
