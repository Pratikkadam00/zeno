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

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } }
  ],
  webServer: {
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
  }
});
