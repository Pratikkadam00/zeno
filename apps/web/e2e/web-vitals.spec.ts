import { expect, test, type Page } from "@playwright/test";

// P4.2c: Core Web Vitals budgets, measured in Chrome under Lighthouse's own
// mobile throttling, with no extra dependency. The metrics come from the same
// browser APIs Google's web-vitals library reads: largest-contentful-paint,
// layout-shift (session windows: a gap over 1 s or a window over 5 s starts a
// new one; CLS is the worst window) and event timing (INP: the slowest
// interaction, which is the definition below 50 interactions).
//
// Throttling: Lighthouse's mobile preset is 150 ms latency, 1.6 Mbps down /
// 750 Kbps up and a 4x CPU slowdown (lighthouse/docs/throttling.md). Applied
// through DevTools, Lighthouse multiplies latency by 3.75 and throughput by
// 0.9 (DEVTOOLS_RTT_ADJUSTMENT_FACTOR / DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
// GoogleChrome/lighthouse#7330); those adjusted values are used here.
//
// Budgets: Google's "good" thresholds (web.dev/articles/vitals): LCP <= 2.5 s,
// CLS <= 0.1, INP <= 200 ms.
const BUDGET = { lcp: 2500, cls: 0.1, inp: 200 };
const kbps = (k: number) => (k * 1024) / 8; // bytes per second, as DevTools wants

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150 * 3.75,
    downloadThroughput: kbps(1.6 * 1024 * 0.9),
    uploadThroughput: kbps(750 * 0.9)
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

async function observeVitals(page: Page) {
  await page.addInitScript(() => {
    const v = { lcp: 0, cls: 0, inp: 0 };
    (window as unknown as { __vitals: typeof v }).__vitals = v;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) v.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    let windowSum = 0;
    let windowStart = 0;
    let last = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (e.hadRecentInput) continue;
        if (windowSum > 0 && (e.startTime - last > 1000 || e.startTime - windowStart > 5000)) windowSum = 0;
        if (windowSum === 0) windowStart = e.startTime;
        windowSum += e.value;
        last = e.startTime;
        v.cls = Math.max(v.cls, windowSum);
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[]) {
        if (e.interactionId) v.inp = Math.max(v.inp, e.duration);
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
}

const read = (page: Page) => page.evaluate(() => (window as unknown as { __vitals: { lcp: number; cls: number; inp: number } }).__vitals);

/** Scroll the whole page in steps, so shifts below the fold are counted. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
  });
}

type Interact = (page: Page) => Promise<void>;
const toggleTheme: Interact = async (page) => {
  await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
  await page.getByRole("button", { name: /Switch to (dark|light) theme/ }).click();
};
const CASES: [string, Interact][] = [
  [
    "/",
    async (page) => {
      await toggleTheme(page);
      await page.getByRole("button", { name: /When does Zeno launch\?/ }).click();
      await page.getByRole("switch", { name: /^Cancel Netflix/ }).click();
    }
  ],
  ["/cancel", async (page) => page.getByRole("searchbox", { name: "Search cancellation guides" }).pressSequentially("spot")],
  ["/cancel/netflix", toggleTheme],
  ["/compare/rocket-money-alternative", toggleTheme],
  ["/legal/privacy", toggleTheme]
];

// Its own project ("vitals", playwright.config.ts): the phone profile, run
// after the other tests and serially, never alongside them.
test.describe.configure({ mode: "serial" });

test.describe("Core Web Vitals under Lighthouse's mobile throttling", () => {

  for (const [path, interact] of CASES) {
    test(`${path}: LCP <= 2.5 s, CLS <= 0.1, INP <= 200 ms`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await observeVitals(page);
      await throttle(page);
      await page.goto(path, { waitUntil: "load" });
      await page.waitForTimeout(1500);
      const { lcp } = await read(page); // LCP stops at the first input
      await scrollThrough(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await interact(page);
      await page.waitForTimeout(800);
      const { cls, inp } = await read(page);
      info.annotations.push({ type: "vitals", description: `${path} LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}, INP ${Math.round(inp)} ms` });
      console.log(`VITALS ${path} LCP ${Math.round(lcp)} ms, CLS ${cls.toFixed(3)}, INP ${Math.round(inp)} ms`);
      expect(lcp, "LCP was measured").toBeGreaterThan(0);
      expect.soft(lcp, "LCP (ms)").toBeLessThanOrEqual(BUDGET.lcp);
      expect.soft(cls, "CLS").toBeLessThanOrEqual(BUDGET.cls);
      expect.soft(inp, "INP (ms)").toBeLessThanOrEqual(BUDGET.inp);
    });
  }
});
