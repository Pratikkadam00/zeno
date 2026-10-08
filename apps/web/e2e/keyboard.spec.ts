import { expect, test, type Page } from "@playwright/test";

// W7.5 (docs/WEB_PLAN.md): the site with a keyboard only. On one page per
// template: the first Tab lands on the skip link, which jumps to the main
// column; every element that should take focus does, in document order, and
// nothing traps the focus (the sequence reaches the footer's last link); and
// whatever has focus shows it (a visible outline or a box-shadow ring).

const PAGES = ["/", "/subscription-tracker", "/compare/no-bank-login", "/cancel", "/cancel/netflix", "/blog", "/blog/the-20-minute-subscription-audit", "/features", "/about", "/legal/privacy"];

type Focus = { tag: string; text: string; href: string | null; shown: boolean; reason: string; id: string };

/** What has focus, and whether the focus is visible (outline or ring, not the UA's hidden default). */
async function focused(page: Page): Promise<Focus> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { tag: "body", text: "", href: null, shown: false, reason: "body", id: "body" };
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
    const ring = cs.boxShadow !== "none";
    const border = cs.borderStyle !== "none" && parseFloat(cs.borderWidth) > 0 && cs.borderColor !== cs.backgroundColor;
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? "").trim().slice(0, 40),
      href: el.getAttribute("href"),
      shown: outline || ring || border,
      id: el.dataset.kb ?? "-",
      reason: `outline ${cs.outlineStyle} ${cs.outlineWidth}; shadow ${cs.boxShadow === "none" ? "none" : "set"}`
    };
  });
}

for (const path of PAGES) {
  test(`${path}: skip link first, every control reachable in order, focus visible, no trap`, async ({ page, browserName }) => {
    test.setTimeout(90_000); // many Tabs, and four browser projects share the machine
    test.skip(browserName === "webkit", "WebKit does not move focus to links with Tab unless the OS option is on; Chrome and Firefox cover this");
    await page.goto(path, { waitUntil: "load" });
    await page.keyboard.press("Tab");
    const first = await focused(page);
    expect([path, first.href]).toEqual([path, "#main"]);
    expect(first.shown, `${path}: the skip link shows focus (${first.reason})`).toBe(true);
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => location.hash)).toBe("#main");

    // Everything that should take focus from the main column onward, in
    // document order (the skip link has just carried the focus past the nav,
    // which is its whole purpose).
    const expected = await page.evaluate(() => {
      const main = document.getElementById("main")!;
      return [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter((el) => main.contains(el) || main.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)
        .filter((el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1" && el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden")
        // Each control numbered, so that two controls with the same label (two icon buttons) are told apart.
        .map((el, i) => ((el.dataset.kb = String(i)), `${i}:` + el.tagName.toLowerCase() + "|" + (el.getAttribute("href") ?? "") + "|" + (el.textContent ?? "").trim().slice(0, 40)));
    });
    expect(expected.length).toBeGreaterThan(2);

    const seen: string[] = [];
    const unshown: string[] = [];
    for (let i = 0; i < expected.length + 5; i++) {
      await page.keyboard.press("Tab");
      const f = await focused(page);
      if (f.tag === "body") break; // wrapped to the address bar: the end of the page
      // Firefox gives a scrollable region (the home page's book) a tab stop of its own: fine for a keyboard user, not a control.
      if (f.id === "-" && f.tag === "div") continue;
      const key = `${f.id}:${f.tag}|${f.href ?? ""}|${f.text}`;
      if (seen.at(-1) === key) break; // Firefox keeps the focus on the last control instead of wrapping
      seen.push(key);
      if (!f.shown) unshown.push(`${f.tag} ${f.href ?? ""} "${f.text}" (${f.reason})`);
      if (seen.length > expected.length + 2) break;
    }
    // Reached the footer's last link: nothing trapped the focus on the way.
    expect(seen.at(-1) ?? "", `${path}: the sequence ends at the footer`).toBe(expected.at(-1)!);
    // In document order, no control skipped: the visible, focusable set equals the tabbed set.
    expect(seen, `${path}: tab order`).toEqual(expected);
    expect(unshown, `${path}: every focused control shows it`).toEqual([]);
  });
}
