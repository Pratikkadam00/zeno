import { beforeEach, describe, expect, it } from "vitest";
import { markRequestStart, PRODUCT_EVENT_LABELS, recordProductEvent, recordRequest, renderMetrics, resetMetrics } from "./metrics";

// P6.2: Stryker blanked the HELP/TYPE lines, the duration and count series, the
// label escaping and the in-flight arithmetic of /metrics, and no test noticed:
// the tests checked that a series existed, not what the scraper reads. This pins
// the whole exposition for a known set of requests.

beforeEach(() => resetMetrics());

describe("renderMetrics", () => {
  it("is exactly the Prometheus text for what was recorded", () => {
    markRequestStart();
    markRequestStart();
    recordRequest("GET", "/api/v1/a", 200, 12);
    recordRequest("GET", "/api/v1/a", 201, 0.5);
    // A route label with a quote, a backslash and a newline: escaped, never raw.
    recordRequest("POST", '/x"y\\z\nw', 503, 1);
    markRequestStart();
    recordProductEvent("import_completed", "csv");
    recordProductEvent("import_completed", "csv");
    recordProductEvent("free_cap_hit");

    expect(renderMetrics()).toBe([
      "# HELP zeno_http_requests_total Total HTTP requests by route and status class.",
      "# TYPE zeno_http_requests_total counter",
      'zeno_http_requests_total{method="GET",route="/api/v1/a",status="2xx"} 2',
      'zeno_http_requests_total{method="POST",route="/x\\"y\\\\z\\nw",status="5xx"} 1',
      "# HELP zeno_http_request_duration_ms_sum Sum of request durations in ms by route.",
      "# TYPE zeno_http_request_duration_ms_sum counter",
      'zeno_http_request_duration_ms_sum{method="GET",route="/api/v1/a"} 12.5',
      'zeno_http_request_duration_ms_sum{method="POST",route="/x\\"y\\\\z\\nw"} 1.0',
      "# HELP zeno_http_request_duration_ms_count Count of requests by route (pair with _sum for avg).",
      "# TYPE zeno_http_request_duration_ms_count counter",
      'zeno_http_request_duration_ms_count{method="GET",route="/api/v1/a"} 2',
      'zeno_http_request_duration_ms_count{method="POST",route="/x\\"y\\\\z\\nw"} 1',
      "# HELP zeno_http_in_flight_requests Currently in-flight HTTP requests.",
      "# TYPE zeno_http_in_flight_requests gauge",
      // Three started, three finished (the third finish found none left: floor 0),
      // then one more started.
      "zeno_http_in_flight_requests 1",
      "# HELP zeno_product_events_total Aggregate, anonymous product funnel events (no device or account id).",
      "# TYPE zeno_product_events_total counter",
      'zeno_product_events_total{event="import_completed",label="csv"} 2',
      'zeno_product_events_total{event="free_cap_hit"} 1',
      ""
    ].join("\n"));
  });

  it("never lets the in-flight gauge go below zero", () => {
    recordRequest("GET", "/a", 200, 1);
    expect(renderMetrics()).toContain("\nzeno_http_in_flight_requests 0\n");
  });
});

describe("the product-event allowlist", () => {
  // The public POST /api/v1/events accepts exactly these: a label outside them is
  // refused, so a name dropped from here silently stops being counted.
  it("is exactly these events and labels", () => {
    expect(PRODUCT_EVENT_LABELS).toEqual({
      import_completed: ["csv", "email"],
      share_card_generated: ["found_money", "wrapped_summary", "wrapped_total", "wrapped_most_expensive", "wrapped_top_category", "wrapped_busiest_month", "budget_streak"],
      free_cap_hit: [],
      paywall_purchase_completed: ["zeno_pro_monthly", "zeno_pro_annual", "zeno_pro_lifetime", "zeno_family_monthly"]
    });
  });
});
