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
bash "$here/run.sh" "$device"; flows=$?
bash "$here/a11y-audit.sh" "$device"; audit=$?
echo "flows exit $flows, accessibility audit exit $audit"
[ $flows -eq 0 ] && [ $audit -eq 0 ]
