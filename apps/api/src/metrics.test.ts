import { beforeEach, describe, expect, it } from "vitest";
import { recordProductEvent, renderMetrics, resetMetrics } from "./metrics";

describe("recordProductEvent", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("records a known event with an allowed label", () => {
    expect(recordProductEvent("paywall_purchase_completed", "zeno_pro_annual")).toBe(true);
    const body = renderMetrics();
    expect(body).toContain('zeno_product_events_total{event="paywall_purchase_completed",label="zeno_pro_annual"} 1');
  });

  it("records a known event with no label when the event takes none", () => {
    expect(recordProductEvent("free_cap_hit")).toBe(true);
    const body = renderMetrics();
    expect(body).toContain('zeno_product_events_total{event="free_cap_hit"} 1');
  });

  it("increments an existing counter rather than creating a duplicate line", () => {
    recordProductEvent("free_cap_hit");
    recordProductEvent("free_cap_hit");
    const body = renderMetrics();
    expect(body).toContain('zeno_product_events_total{event="free_cap_hit"} 2');
  });

  it("rejects an unknown event", () => {
    expect(recordProductEvent("totally_made_up_event")).toBe(false);
  });

  it("rejects a label outside the event's allowlist (prevents unbounded cardinality on a public endpoint)", () => {
    expect(recordProductEvent("paywall_purchase_completed", "some_other_sku")).toBe(false);
  });

  it("rejects a missing label when the event requires one", () => {
    expect(recordProductEvent("import_completed")).toBe(false);
  });

  it("rejects a label for an event that doesn't take one", () => {
    expect(recordProductEvent("free_cap_hit", "unexpected")).toBe(false);
  });

  it("keeps different labels of the same event as separate counters", () => {
    recordProductEvent("import_completed", "csv");
    recordProductEvent("import_completed", "email");
    recordProductEvent("import_completed", "csv");
    const body = renderMetrics();
    expect(body).toContain('zeno_product_events_total{event="import_completed",label="csv"} 2');
    expect(body).toContain('zeno_product_events_total{event="import_completed",label="email"} 1');
  });
});

describe("F91: only the allowlist's OWN event names count", () => {
  beforeEach(() => resetMetrics());

  it("a name every object inherits is an unknown event: never recorded, never a throw", () => {
    for (const event of ["toString", "valueOf", "constructor", "hasOwnProperty", "isPrototypeOf", "__proto__", "propertyIsEnumerable", "toLocaleString"]) {
      for (const label of [undefined, "csv", "x"]) {
        expect(() => recordProductEvent(event, label), `${event} / ${label}`).not.toThrow();
        expect(recordProductEvent(event, label), `${event} / ${label}`).toBe(false);
      }
    }
    expect(renderMetrics()).not.toMatch(/toString|valueOf|constructor|hasOwnProperty|__proto__/);
  });

  it("POST /api/v1/events answers 400, not 200 or 500, for those names", async () => {
    const { buildApp } = await import("./app");
    const app = await buildApp();
    let n = 0;
    for (const payload of [{ event: "toString" }, { event: "__proto__" }, { event: "constructor", label: "csv" }, { event: "hasOwnProperty", label: "x" }]) {
      n += 1;
      const r = await app.inject({ method: "POST", url: "/api/v1/events", remoteAddress: `192.0.2.${n}`, payload });
      expect(r.statusCode, JSON.stringify(payload)).toBe(400);
      expect(r.json().error.message).toBe("Unknown event or label.");
    }
  });
});
