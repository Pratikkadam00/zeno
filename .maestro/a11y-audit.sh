#!/usr/bin/env bash
# The accessibility-tree audit (P5): every screen a user can reach, as TalkBack
# sees it (uiautomator dump --compressed = only the nodes accessibility services
# get), must name every control. A clickable node with neither text nor a
# content description is a button TalkBack reads as "button" and nothing else.
#   .maestro/a11y-audit.sh [device]      (after the release APK is installed)
set -uo pipefail
export MSYS_NO_PATHCONV=1 MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=1
here="$(cd "$(dirname "$0")" && pwd)"
device="${1:-emulator-5554}"
adb="${ADB:-adb}"
maestro="${MAESTRO:-maestro}"
py="${PYTHON:-python3}"
command -v "$py" > /dev/null || py=python
work="${TMPDIR:-/tmp}/zeno-a11y"
mkdir -p "$work"

# A realistic state: onboarded, one subscription on the books.
"$maestro" --device "$device" test "$here/common/audit-setup.yaml" > "$work/setup.log" 2>&1 || { echo "setup flow failed"; tail -20 "$work/setup.log"; exit 1; }

# Every screen reachable from the app (routes = files under apps/mobile/app).
routes=(dashboard subscriptions calendar analytics discover settings notifications profile security family coach budget paywall wrapped spend-twin widgets subscription/add)
failed=0
for route in "${routes[@]}"; do
  "$adb" -s "$device" shell am start -W -a android.intent.action.VIEW -d "zeno://$route" app.zeno.mobile > /dev/null
  sleep 3
  out="$work/$(echo "$route" | tr '/' '_').xml"
  "$adb" -s "$device" shell uiautomator dump --compressed /sdcard/a11y.xml > /dev/null
  local_out="$out"
  command -v cygpath > /dev/null && local_out="$(cygpath -w "$out")"
  "$adb" -s "$device" pull /sdcard/a11y.xml "$local_out" > /dev/null
  checker="$here/a11y_check.py"
  command -v cygpath > /dev/null && checker="$(cygpath -w "$checker")"
  result=$("$py" "$checker" "$local_out")
  if [ "$result" = "NOT-ZENO" ]; then
    echo "FAIL $route: Zeno wasn't on screen"; failed=1; continue
  fi
  read -r clickable unnamed rest <<< "$result"
  if [ "$unnamed" != "0" ]; then
    echo "FAIL $route: $unnamed of $clickable controls unnamed at $rest"; failed=1
  else
    echo "PASS $route: $clickable controls, all named"
  fi
done
exit $failed
