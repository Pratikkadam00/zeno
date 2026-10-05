// Uptime check (P8): is the production API up and its database reachable?
//   node scripts/uptime-check.mjs [url]
// Asks /api/v1/health/ready and passes only on 200 with status "ready" and every
// check "ok". A free Render service sleeps when idle and takes up to about a
// minute to wake, so a failed first try is retried once, after a pause, before
// the check fails (and GitHub emails the owner about the failed run).

export const DEFAULT_URL = "https://zeno-api-5dwv.onrender.com/api/v1/health/ready";

/** One attempt: null when healthy, else what was wrong. */
export async function probe(url, timeoutMs) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
    if (response.status !== 200) return `status ${response.status}`;
    const body = await response.json();
    if (body?.data?.status !== "ready") return `not ready: ${JSON.stringify(body?.data ?? null).slice(0, 200)}`;
    const failing = Object.entries(body.data.checks ?? {}).filter(([, state]) => state !== "ok");
    return failing.length ? `failing checks: ${failing.map(([name, state]) => `${name}=${state}`).join(", ")}` : null;
  } catch (error) {
    return `no answer: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** Two tries with a pause between; resolves to the list of problems (empty when up). */
export async function check(url, { timeoutMs = 90_000, retryAfterMs = 30_000, wait = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const first = await probe(url, timeoutMs);
  if (first === null) return [];
  await wait(retryAfterMs);
  const second = await probe(url, timeoutMs);
  return second === null ? [] : [first, second];
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("uptime-check.mjs")) {
  const url = process.argv[2] ?? DEFAULT_URL;
  const problems = await check(url);
  if (problems.length) {
    console.error(`DOWN ${url}\n  first try: ${problems[0]}\n  retry: ${problems[1]}`);
    process.exit(1);
  }
  console.log(`UP ${url}`);
}
