# Zeno Buttons

Runnable local Figma plugin that generates the `Zeno · Buttons` component library page.

## Run

1. Open Figma Desktop.
2. Go to `Plugins` -> `Development` -> `Import plugin from manifest`.
3. Select `manifest.json` in this folder.
4. Run `Zeno Buttons` from `Plugins` -> `Development`.

Re-running the plugin removes and regenerates the `Zeno · Buttons` page, `Zeno Tokens` variables, and the Zeno button text/effect styles so the file does not accumulate duplicates.

## Components generated (full button inventory)

**Web**
- `Web/Button` — Type {Primary, Ghost} × Size {Default, Small} × State {Default, Hover, Focus, Disabled}
- `Web/Button/CTA` — standalone gradient CTA (Default / Hover-lifted)
- `Web/SegmentedToggle` + `Web/Pill` — billing toggle with the emerald "save" sub-pill
- `Web/Pill/Tag` and `Web/Pill/Brand` — gradient mono pills
- `Web/IconButton` — nav toggle (menu / close)
- `Web/RangeToggle` — analytics range buttons (Inactive / Hover / Active)

**Mobile** (themed across Pulse / Clarity / Command)
- `Mobile/PrimaryButton` — Theme × State {Default, Pressed, Disabled}
- `Mobile/SecondaryButton` — surfaceAlt fill, primary text
- `Mobile/DangerPill` — the in-app "Cancel" pill
- `Mobile/TextButton` — transparent "Undo"
- `Mobile/ThemeToggle` — 3-way theme switch, active segment in theme primary
- `Mobile/FeaturePill` — intelligence-suite chips (Active vs Locked)

All colors, radii, padding, shadows, and typography are pulled from the app source
(`apps/web/app/globals.css` + `home.module.css`, `content.module.css`,
`apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/components/ui.tsx`) and bound to
the `Zeno Tokens` variable collection (modes: Web, Pulse, Clarity, Command).

Excluded by design: purely decorative in-mockup mini-buttons in the marketing hero
illustration, and non-interactive status badges (urgency/free-tier counters).
