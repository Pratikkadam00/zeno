import { expect, test } from "@playwright/test";

// W7.2 (docs/WEB_PLAN.md): a known-good picture of every template, light and
// dark, compared pixel by pixel against the committed baseline. Rendering
// differs between operating systems (fonts, antialiasing), so the baselines
// are made where CI renders, on Linux, by .github/workflows/visual.yml, and
// committed from its artifact. The project runs only when VISUAL=1
// (playwright.config.ts), so a missing baseline never fails the ordinary run.
//
// Animations are frozen and the clock fixed, so the only differences are real
// ones. A deliberate design change updates the baselines in the same commit:
//   VISUAL=1 npx playwright test --project=visual-desktop --project=visual-mobile --update-snapshots

const PAGES = ["/", "/subscription-tracker", "/compare/ynab-alternative", "/cancel", "/cancel/netflix", "/blog", "/blog/the-20-minute-subscription-audit", "/features/family-vault", "/about", "/roadmap", "/legal/terms", "/no-such-page"];

for (const theme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${path} · ${theme}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-10-09T09:00:00Z"));
      if (theme === "dark") await page.addInitScript(() => localStorage.setItem("zeno-theme", "dark"));
      await page.goto(path, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }" });
      await expect(page).toHaveScreenshot(`${path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-")}-${theme}.png`, {
        fullPage: true,
        animations: "disabled",
        maxDiffPixelRatio: 0.002
      });
    });
  }
}
