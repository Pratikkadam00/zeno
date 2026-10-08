import { defineConfig, devices } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

// P4.2: the website in a real browser. The tests run against the production
// server (`next start` over the build), so headers, CSP and prerendered HTML
// are exactly what visitors get. Requires `npm run build --workspace @zeno/web`
// first (CI builds it in the step before).
//
// Browser: the installed Google Chrome (channel "chrome"), not a downloaded
// Playwright build. GitHub's ubuntu-24.04 image ships Chrome, and locally
// nothing extra is downloaded.
const PORT = 3100;
// WebKit talks to a TLS front (e2e/tls-proxy.mjs): its upgrade-insecure-requests has no exemption for 127.0.0.1.
const TLS_PORT = 3101;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Firefox under Playwright crashed and timed out with eight instances at once on an eight-core machine (2026-10-09); two is steady (four still timed out on navigations).
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  // Four browser projects share one machine (W7.3, W7.4): a navigation that took 20 s under that load timed out at 30 s once (2026-10-09).
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /web-vitals|visual/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "mobile",
      testIgnore: /web-vitals|visual/,
      use: { ...devices["Pixel 7"], channel: "chrome" }
    },
    // W7.3, W7.4: the same site in Firefox and in WebKit (Safari's engine),
    // Playwright's own builds (CI installs them with their system deps). The
    // timing budgets stay Chrome-only; everything else runs in all three.
    {
      name: "firefox",
      testIgnore: /web-vitals|visual/,
      // After the Chrome projects, and WebKit after this one: four engines at once starved Firefox of CPU (navigations timed out at 60 s, 2026-10-09).
      dependencies: ["desktop", "mobile"],
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 }
      }
    },
    {
      name: "webkit",
      testIgnore: /web-vitals|visual/,
      dependencies: ["firefox"],
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
        baseURL: `https://127.0.0.1:${TLS_PORT}`,
        ignoreHTTPSErrors: true
      }
    },
    // Timing budgets (P4.2c) on the phone profile, after the others and one
    // test at a time: a throttled measurement taken while other tests compete
    // for the CPU measures the machine, not the page.
    {
      name: "vitals",
      testMatch: /web-vitals/,
      dependencies: ["desktop", "mobile"],
      fullyParallel: false,
      use: { ...devices["Pixel 7"], channel: "chrome" }
    },
    // W7.2: pixel comparisons against baselines rendered on Linux (visual.yml).
    // Only when asked for (VISUAL=1), so that a missing baseline never fails
    // the ordinary run on a machine that renders differently.
    ...(process.env.VISUAL
      ? [
          { name: "visual-desktop", testMatch: /visual/, use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
          { name: "visual-mobile", testMatch: /visual/, use: { ...devices["Pixel 7"], channel: "chrome" } }
        ]
      : [])
  ],
  webServer: [
    {
      command: `npx next start -p ${PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${PORT}/`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        // Sign-ups go to a throwaway file, never the repo's .data/.
        WAITLIST_FILE: join(tmpdir(), `zeno-e2e-waitlist-${process.pid}.ndjson`),
        // One trusted hop, so each test can name its own client IP and the
        // per-IP rate limit is testable without tests sharing one bucket.
        TRUST_PROXY_HOPS: "1"
      }
    },
    {
      command: `node e2e/tls-proxy.mjs ${TLS_PORT} ${PORT}`,
      url: `https://127.0.0.1:${TLS_PORT}/`,
      ignoreHTTPSErrors: true,
      reuseExistingServer: false,
      timeout: 30_000
    }
  ]
});
