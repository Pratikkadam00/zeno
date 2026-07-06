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

// Aggregate, anonymous product-funnel counters (Phase 5.3) — distinct from the
// per-HTTP-request metrics above. POST /api/v1/events is public/unauthenticated
// (local-only, no-account users must be able to call it too), so events and
// their labels are checked against a FIXED allowlist rather than accepted
// free-form — otherwise a public endpoint could be used to inject unbounded
// cardinality into this in-memory map. No device id, account id, or anything
// else that could re-identify or correlate a device's events is ever recorded
// here — event name + an optional coarse label (e.g. a SKU) only.
const PRODUCT_EVENT_LABELS: Record<string, readonly string[]> = {
  import_completed: ["csv", "email"],
  share_card_generated: ["found_money", "wrapped_summary", "wrapped_total", "wrapped_most_expensive", "wrapped_top_category", "wrapped_busiest_month", "budget_streak"],
  free_cap_hit: [],
  paywall_purchase_completed: ["zeno_pro_monthly", "zeno_pro_annual", "zeno_pro_lifetime", "zeno_family_monthly"]
};

const eventTotals = new Map<string, number>(); // `${event}|${label}` -> count

// Validates event/label against the allowlist and increments the counter.
// Returns false (nothing recorded) for an unknown event, a label outside the
// event's allowed set, a missing label where one is required, or a label
// where the event doesn't take one.
export function recordProductEvent(event: string, label?: string): boolean {
  const allowedLabels = PRODUCT_EVENT_LABELS[event];
  if (!allowedLabels) {
    return false;
  }
  if (allowedLabels.length > 0) {
    if (!label || !allowedLabels.includes(label)) {
      return false;
    }
  } else if (label) {
    return false;
  }
  const key = `${event}|${label ?? ""}`;
  eventTotals.set(key, (eventTotals.get(key) ?? 0) + 1);
  return true;
}

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
  lines.push("# HELP zeno_product_events_total Aggregate, anonymous product funnel events (no device or account id).");
  lines.push("# TYPE zeno_product_events_total counter");
  for (const [key, count] of eventTotals) {
    const barIndex = key.lastIndexOf("|");
    const event = key.slice(0, barIndex);
    const label = key.slice(barIndex + 1);
    lines.push(`zeno_product_events_total{event="${esc(event)}"${label ? `,label="${esc(label)}"` : ""}} ${count}`);
  }
  return `${lines.join("\n")}\n`;
}

// Test-only: reset all counters so metric assertions don't leak across tests.
export function resetMetrics(): void {
  requestTotals.clear();
  durationSums.clear();
  durationCounts.clear();
  eventTotals.clear();
  inFlight = 0;
}
