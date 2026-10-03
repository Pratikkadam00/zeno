import { describe, expect, it } from "vitest";
import { alertsOf, annotation, evaluate } from "./zap-gate.mjs";

// The shape of ZAP's traditional-json report (zap-extensions:
// addOns/reports/.../traditional-json/report.json): strings throughout.
const alert = (over: Record<string, unknown> = {}) => ({
  pluginid: "10038",
  alertRef: "10038-1",
  alert: "Content Security Policy (CSP) Header Not Set",
  name: "Content Security Policy (CSP) Header Not Set",
  riskcode: "2",
  confidence: "3",
  riskdesc: "Medium (High)",
  instances: [{ uri: "http://127.0.0.1:3100/", method: "GET" }, { uri: "http://127.0.0.1:3100/", method: "GET" }],
  ...over
});
const report = (alerts: unknown[], extra: Record<string, unknown> = {}) => ({
  "@programName": "ZAP",
  "@version": "2.17.0",
  site: [{ "@name": "http://127.0.0.1:3100", "@host": "127.0.0.1", "@port": "3100", "@ssl": "false", alerts }],
  ...extra
});
const none = { accepted: [] };
const today = new Date("2026-10-03T00:00:00Z");

describe("alertsOf", () => {
  it("flattens each alert with its site, rule, risk, confidence and distinct URIs", () => {
    expect(alertsOf(report([alert()]))).toEqual([
      {
        site: "http://127.0.0.1:3100",
        pluginId: "10038",
        name: "Content Security Policy (CSP) Header Not Set",
        risk: 2,
        confidence: 3,
        uris: ["http://127.0.0.1:3100/"]
      }
    ]);
  });

  it("an empty or odd report has no alerts", () => {
    expect(alertsOf({})).toEqual([]);
    expect(alertsOf(null)).toEqual([]);
    expect(alertsOf(report([]))).toEqual([]);
  });
});

describe("evaluate", () => {
  it("passes Informational and Low alerts (printed, not blocking)", () => {
    const result = evaluate([{ target: "website", report: report([alert({ riskcode: "0" }), alert({ riskcode: "1", pluginid: "10021" })]) }], none, today);
    expect(result.ok).toBe(true);
    expect(result.alerts.map((a) => a.blocking)).toEqual([false, false]);
  });

  it("fails a Medium and a High alert, naming target, rule and where", () => {
    const result = evaluate([{ target: "website", report: report([alert(), alert({ riskcode: "3", pluginid: "40012", name: "Cross Site Scripting (Reflected)" })]) }], none, today);
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      'website: Medium "Content Security Policy (CSP) Header Not Set" (ZAP rule 10038) at http://127.0.0.1:3100/',
      'website: High "Cross Site Scripting (Reflected)" (ZAP rule 40012) at http://127.0.0.1:3100/'
    ]);
  });

  it("doesn't block an alert ZAP itself marked a false positive (confidence 0)", () => {
    const result = evaluate([{ target: "website", report: report([alert({ confidence: "0" })]) }], none, today);
    expect(result.ok).toBe(true);
    expect(result.alerts[0]).toMatchObject({ falsePositive: true, blocking: false });
  });

  it("passes an accepted alert only for its own target and rule, and only until it expires", () => {
    const accepted = { accepted: [{ target: "website", pluginId: "10038", reason: "why", expires: "2026-12-31" }] };
    expect(evaluate([{ target: "website", report: report([alert()]) }], accepted, today).ok).toBe(true);
    expect(evaluate([{ target: "api", report: report([alert()]) }], accepted, today).ok).toBe(false);
    expect(evaluate([{ target: "website", report: report([alert({ pluginid: "10055" })]) }], accepted, today).ok).toBe(false);
    const expired = evaluate([{ target: "website", report: report([alert()]) }], accepted, new Date("2027-01-01T00:00:00Z"));
    expect(expired.ok).toBe(false);
    expect(expired.problems[0]).toMatch(/EXPIRED on 2026-12-31/);
  });

  it("fails a scan ZAP stopped early, and a report with nothing scanned", () => {
    const stopped = evaluate([{ target: "api", report: report([], { stoppingInsight: { level: "High", reason: "stop", description: "Too many errors" } }) }], none, today);
    expect(stopped.ok).toBe(false);
    expect(stopped.problems).toEqual(["api: ZAP stopped the scan early (stop)"]);
    const empty = evaluate([{ target: "api", report: { site: [] } }], none, today);
    expect(empty.problems).toEqual(["api: the report has no site in it (nothing was scanned)"]);
  });

  it("judges several reports together", () => {
    const result = evaluate(
      [
        { target: "website", report: report([alert({ riskcode: "1" })]) },
        { target: "api-services", report: report([alert()]) }
      ],
      none,
      today
    );
    expect(result.ok).toBe(false);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toMatch(/^api-services: Medium/);
  });
});

describe("annotation", () => {
  it("an error for a blocking alert, a warning for Low, a notice for Informational, with escaping", () => {
    const [blocking] = evaluate([{ target: "website", report: report([alert({ name: "50%\nbad" })]) }], none, today).alerts;
    expect(annotation(blocking!)).toBe("::error title=ZAP Medium: 50%25%0Abad::website: rule 10038 at http://127.0.0.1:3100/");
    const [low] = evaluate([{ target: "website", report: report([alert({ riskcode: "1" })]) }], none, today).alerts;
    expect(annotation(low!)).toMatch(/^::warning title=ZAP Low/);
    const [info] = evaluate([{ target: "website", report: report([alert({ riskcode: "0", instances: [] })]) }], none, today).alerts;
    expect(annotation(info!)).toBe("::notice title=ZAP Informational: Content Security Policy (CSP) Header Not Set::website: rule 10038");
  });

  it("marks false positives and accepted alerts, and counts URIs past three", () => {
    const uris = ["/a", "/b", "/c", "/d", "/e"].map((p) => ({ uri: `http://h${p}` }));
    const [fp] = evaluate([{ target: "website", report: report([alert({ confidence: "0", instances: uris })]) }], none, today).alerts;
    expect(annotation(fp!)).toBe("::warning title=ZAP Medium: Content Security Policy (CSP) Header Not Set::website: rule 10038 [ZAP: false positive] at http://h/a, http://h/b, http://h/c (+2 more)");
    const accepted = { accepted: [{ target: "website", pluginId: "10038", reason: "r", expires: "2026-12-31" }] };
    const [acc] = evaluate([{ target: "website", report: report([alert()]) }], accepted, today).alerts;
    expect(annotation(acc!)).toMatch(/\[accepted: \.zap-accepted\.json\]/);
  });
});
