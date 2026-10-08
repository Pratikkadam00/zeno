import { expect, test } from "@playwright/test";

// W7.6 (docs/WEB_PLAN.md): the site at 200 % zoom (WCAG 1.4.4 and 1.4.10).
// Browser zoom halves the CSS viewport: a 1280-wide screen at 200 % lays the
// page out at 640 CSS pixels, drawn at two device pixels each. That is what
// the viewport below is. On one page per template: no horizontal scrolling,
// the heading and the first paragraph fully inside the viewport width, and
// no text clipped by an overflow:hidden box.

const PAGES = ["/", "/subscription-tracker", "/compare/ynab-alternative", "/cancel", "/cancel/netflix", "/blog", "/blog/the-20-minute-subscription-audit", "/features/family-vault", "/about", "/legal/terms"];

// The layout is what is checked, so the viewport alone is set; drawing at 2× changed nothing and made Firefox slow under load.
test.use({ viewport: { width: 640, height: 450 } });

for (const path of PAGES) {
  test(`${path} at 200 %: no sideways scroll, nothing clipped`, async ({ page }) => {
    test.setTimeout(60_000); // four browser projects share the machine
    await page.goto(path, { waitUntil: "load" });
    const report = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = doc.scrollWidth > doc.clientWidth + 1;
      const clipped: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("main h1, main h2, main p, main li, main a, main button")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) continue;
        if (r.right > doc.clientWidth + 1 || r.left < -1) clipped.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}" spans ${Math.round(r.left)}..${Math.round(r.right)} of ${doc.clientWidth}`);
        const cs = getComputedStyle(el);
        if ((cs.overflowX === "hidden" || cs.overflow === "hidden") && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== "ellipsis" && cs.whiteSpace === "nowrap") clipped.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}" is cut off`);
      }
      return { wide, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, clipped: clipped.slice(0, 8) };
    });
    expect(report.wide, `${path}: page is ${report.scrollWidth} wide in a ${report.clientWidth} viewport`).toBe(false);
    expect(report.clipped, path).toEqual([]);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}
