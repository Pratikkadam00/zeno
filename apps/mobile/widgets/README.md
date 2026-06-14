# Zeno home-screen widgets + watch (scaffold)

⚠️ **Status: scaffolded, NOT yet verified.** The JS data bridge is wired and
typechecks, but the native widget extensions require a custom native build
(EAS / bare workflow) and cannot be exercised in a JS-only / Expo Go environment.
This document is the contract + the remaining native steps.

## What's already wired (JS side)

- `src/widgets/widgetBridge.ts` — `refreshWidgetSnapshot(snapshot)` serializes the
  store's `WidgetSnapshot` into a flat `WidgetPayload` and persists it under
  `AsyncStorage` key **`zeno.widget.snapshot.v1`**.
- `app/_layout.tsx` calls it after hydration and whenever the subscription set
  changes, so the payload is always current.

`WidgetPayload` shape:

```json
{
  "monthlySpendLabel": "$107.46",
  "activeCount": 5,
  "nextRenewalName": "Netflix",
  "nextRenewalAmount": "$15.49",
  "nextRenewalDaysUntil": 1,
  "watchComplicationText": "Netflix in 1d",
  "generatedAt": "2026-06-14T..."
}
```

## Remaining native steps (require an EAS / bare build)

1. **iOS — WidgetKit extension**
   - Add a Widget Extension target + an **App Group** (e.g. `group.app.zeno`).
   - Mirror the payload into the App Group's shared `UserDefaults` so the widget
     can read it (a tiny native module that writes the same JSON on
     `refreshWidgetSnapshot`, keyed in the App Group, is the cleanest bridge).
   - Build the SwiftUI views (small/medium): next renewal + monthly spend.
   - Apple Watch complication renders `watchComplicationText`.

2. **Android — App Widget**
   - Add an `AppWidgetProvider` + `RemoteViews` layout.
   - Mirror the payload into `SharedPreferences` and trigger a widget update.

3. **Expo config plugin**
   - Add a config plugin (or use `@bacons/apple-targets` for iOS) to register the
     widget target, entitlements, and App Group at prebuild time. Wire it in
     `app.config.ts`.

4. **Refresh triggers**
   - Call the platform widget-reload API (`WidgetCenter.shared.reloadAllTimelines()`
     on iOS / `AppWidgetManager` on Android) from the native bridge after each
     `refreshWidgetSnapshot`.

## Verify (once built)
Run `eas build` (or `expo prebuild` + native run), add the widget to the home
screen, change a subscription in-app, and confirm the widget + watch complication
update with the new next-renewal / monthly-spend values.
