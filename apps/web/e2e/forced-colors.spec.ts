import { expect, test } from "@playwright/test";

// W7.7 (docs/WEB_PLAN.md): the browser's forced-colours mode (Windows High
// Contrast). The browser replaces the site's colours with the system's; what
// must survive is structure: every control still has a visible edge (the
// system draws borders for native buttons and inputs, so custom controls are
// the risk), text is not hidden by a background that no longer exists, and
// nothing opts out of the mode with forced-color-adjust: none except an image.

const PAGES = ["/", "/cancel/netflix", "/blog/the-20-minute-subscription-audit", "/about"];

for (const path of PAGES) {
  test(`${path} in forced colours: every control keeps an edge, nothing opts out`, async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit has no forced-colors emulation");
    await page.goto(path, { waitUntil: "load" });
    await page.emulateMedia({ forcedColors: "active" });
    const report = await page.evaluate(() => {
      const edgeless: string[] = [];
      const optedOut: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("button, [role='switch'], [role='button'], input, select, textarea")) {
        if (el.offsetParent === null) continue;
        const cs = getComputedStyle(el);
        const border = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none";
        const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        if (!border && !outline) edgeless.push(`${el.tagName.toLowerCase()}${el.getAttribute("role") ? `[role=${el.getAttribute("role")}]` : ""} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}"`);
      }
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        const cs = getComputedStyle(el);
        if (cs.getPropertyValue("forced-color-adjust") === "none" && el.tagName !== "IMG" && el.tagName !== "SVG") optedOut.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
      }
      const h1 = document.querySelector("h1");
      const h1Visible = !!h1 && getComputedStyle(h1).visibility !== "hidden" && h1.getBoundingClientRect().height > 0;
      return { edgeless: edgeless.slice(0, 10), optedOut: optedOut.slice(0, 10), h1Visible };
    });
    expect(report.h1Visible, `${path}: the heading is there`).toBe(true);
    expect(report.optedOut, `${path}: nothing but pictures opts out of forced colours`).toEqual([]);
    expect(report.edgeless, `${path}: every control has an edge`).toEqual([]);
  });
}
