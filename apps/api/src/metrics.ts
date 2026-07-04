// Minimal hand-rolled metrics — request counts, latency, and in-flight gauge,
// exposed at /metrics in Prometheus text format so any scraper (Prometheus,
// Grafana Agent, the Render metrics sink) can read them without adding a metrics
// SDK. In-memory and per-process, like the rate limiter's default store; with
// multiple instances each exposes its own slice (the standard multi-target model).

type RouteKey = string; // `${method} ${routePattern}`

const requestTotals = new Map<string, number>(); // `${routeKey}|${statusClass}` -> count
const durationSums = new Map<RouteKey, number>(); // routeKey -> total ms
const durationCounts = new Map<RouteKey, number>(); // routeKey -> observations
let inFlight = 0;

export function markRequestStart(): void {
  inFlight += 1;
}

export function recordRequest(method: string, routePattern: string, statusCode: number, durationMs: number): void {
  inFlight = Math.max(0, inFlight - 1);
  const routeKey = `${method} ${routePattern}`;
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  const totalKey = `${routeKey}|${statusClass}`;
  requestTotals.set(totalKey, (requestTotals.get(totalKey) ?? 0) + 1);
  durationSums.set(routeKey, (durationSums.get(routeKey) ?? 0) + durationMs);
  durationCounts.set(routeKey, (durationCounts.get(routeKey) ?? 0) + 1);
}

// Escape label values per the Prometheus text exposition format.
function esc(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function splitRouteKey(routeKey: string): { method: string; route: string } {
  const spaceIndex = routeKey.indexOf(" ");
  return {
    method: routeKey.slice(0, spaceIndex),
    route: routeKey.slice(spaceIndex + 1)
  };
}

export function renderMetrics(): string {
  const lines: string[] = [];
  lines.push("# HELP zeno_http_requests_total Total HTTP requests by route and status class.");
  lines.push("# TYPE zeno_http_requests_total counter");
  for (const [key, count] of requestTotals) {
    const barIndex = key.lastIndexOf("|");
    const { method, route } = splitRouteKey(key.slice(0, barIndex));
    const statusClass = key.slice(barIndex + 1);
    lines.push(
      `zeno_http_requests_total{method="${esc(method)}",route="${esc(route)}",status="${esc(statusClass)}"} ${count}`
    );
  }
  lines.push("# HELP zeno_http_request_duration_ms_sum Sum of request durations in ms by route.");
  lines.push("# TYPE zeno_http_request_duration_ms_sum counter");
  for (const [routeKey, sum] of durationSums) {
    const { method, route } = splitRouteKey(routeKey);
    lines.push(`zeno_http_request_duration_ms_sum{method="${esc(method)}",route="${esc(route)}"} ${sum.toFixed(1)}`);
  }
  lines.push("# HELP zeno_http_request_duration_ms_count Count of requests by route (pair with _sum for avg).");
  lines.push("# TYPE zeno_http_request_duration_ms_count counter");
  for (const [routeKey, count] of durationCounts) {
    const { method, route } = splitRouteKey(routeKey);
    lines.push(`zeno_http_request_duration_ms_count{method="${esc(method)}",route="${esc(route)}"} ${count}`);
  }
  lines.push("# HELP zeno_http_in_flight_requests Currently in-flight HTTP requests.");
  lines.push("# TYPE zeno_http_in_flight_requests gauge");
  lines.push(`zeno_http_in_flight_requests ${inFlight}`);
  return `${lines.join("\n")}\n`;
}

// Test-only: reset all counters so metric assertions don't leak across tests.
export function resetMetrics(): void {
  requestTotals.clear();
  durationSums.clear();
  durationCounts.clear();
  inFlight = 0;
}
