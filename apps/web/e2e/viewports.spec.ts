import { expect, test } from "@playwright/test";

// Every page type at the screen sizes people actually use, from a 320px phone
// to a 27" QHD monitor: nothing wider than the screen (no sideways scroll, no
// zoomed-out phone), and on the big screens the book scales its content up.
// Measured before this test existed (2026-10-04): a 375px phone laid the
// homepage out 447px wide; on 2560x1440 the content filled 44% of the sheet.

const WIDTHS: [number, number][] = [
  [320, 568],
  [360, 780],
  [375, 812],
  [390, 844],
  [412, 915],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1440]
];
const PATHS = ["/", "/blog", "/blog/how-to-find-all-your-subscriptions", "/cancel", "/cancel/netflix", "/compare", "/features"];

const widest = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const vw = window.innerWidth;
    const over = [...document.querySelectorAll("body *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        const cs = getComputedStyle(e);
        return r.width > 0 && cs.position !== "fixed" && r.right > vw + 1;
      })
      .slice(0, 5)
      .map((e) => `${e.tagName}.${typeof e.className === "string" ? e.className.split(" ")[0] : ""} right=${Math.round(e.getBoundingClientRect().right)}`);
    return { vw, scrollW: document.documentElement.scrollWidth, over };
  });

for (const [w, h] of WIDTHS) {
  for (const path of PATHS) {
    test(`${path} at ${w}x${h}: nothing wider than the screen`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto(path, { waitUntil: "networkidle" });
      const m = await widest(page);
      expect(m.vw, "the layout viewport is the screen (a wider one means the phone zoomed out)").toBe(w);
      expect(m.over, "elements past the right edge").toEqual([]);
      expect(m.scrollW, "no horizontal scroll").toBeLessThanOrEqual(w);
    });
  }
}

test("the book scales its content to the sheet on large screens (F203)", async ({ page, isMobile }) => {
  test.skip(isMobile, "the book needs a fine pointer");
  const h1Px = async () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("h1")!).fontSize));
  const zoomAt = async (w: number, h: number) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.locator("[aria-roledescription='ledger book']")).toBeVisible();
    const sheet = page.locator("[aria-roledescription='ledger book'] section").first();
    const sheetBox = (await sheet.boundingBox())!;
    const h1 = await page.locator("h1").boundingBox();
    const zoom = await page.evaluate(() => getComputedStyle(document.querySelector("[aria-roledescription='ledger book']")!).getPropertyValue("--book-zoom").trim());
    return { h1Font: await h1Px(), h1Width: h1!.width, sheetWidth: sheetBox.width, zoom };
  };
  const base = await zoomAt(1440, 900);
  const big = await zoomAt(2560, 1440);
  expect(base.zoom).toBe("1");
  expect(parseFloat(big.zoom)).toBeGreaterThan(1.5);
  // The headline is laid out at the same CSS size, then scaled: it renders larger.
  expect(big.h1Width).toBeGreaterThan(base.h1Width * 1.4);
  // The content now covers more of the sheet than before (it was 44%).
  const content = await page.locator("[aria-roledescription='ledger book'] section [class*='container']").first().boundingBox();
  expect(content!.width / big.sheetWidth).toBeGreaterThan(0.6);
});
