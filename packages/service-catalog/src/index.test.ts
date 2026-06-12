import { describe, expect, it } from "vitest";
import { findServiceBySlug, parsePriceToMinorUnits, searchServices, services, toServiceRecord } from "./index";

describe("service catalog", () => {
  it("finds services by slug", () => {
    expect(findServiceBySlug("midjourney")?.name).toBe("Midjourney");
  });

  it("fuzzy searches likely service names", () => {
    expect(searchServices("mid")[0]?.slug).toBe("midjourney");
  });

  it("ships at least the phase-five top-50 launch catalog", () => {
    expect(services.length).toBeGreaterThanOrEqual(50);
    expect(new Set(services.map((service) => service.slug)).size).toBe(services.length);
  });
});

describe("parsePriceToMinorUnits", () => {
  it("parses two-decimal prices exactly", () => {
    expect(parsePriceToMinorUnits("1.99")).toBe(199);
    expect(parsePriceToMinorUnits("19.99")).toBe(1999);
    expect(parsePriceToMinorUnits("54.99")).toBe(5499);
  });

  it("pads single-decimal prices to cents", () => {
    expect(parsePriceToMinorUnits("10.5")).toBe(1050);
    expect(parsePriceToMinorUnits("0.5")).toBe(50);
  });

  it("handles whole-dollar prices", () => {
    expect(parsePriceToMinorUnits("7")).toBe(700);
    expect(parsePriceToMinorUnits("120")).toBe(12000);
  });

  it("truncates fractions beyond two digits without float drift", () => {
    expect(parsePriceToMinorUnits("12.345")).toBe(1234);
    expect(parsePriceToMinorUnits("29.999")).toBe(2999);
  });

  it("accepts numeric input without float rounding errors", () => {
    expect(parsePriceToMinorUnits(1.15)).toBe(115);
    expect(parsePriceToMinorUnits(10.99)).toBe(1099);
  });

  it("converts catalog prices to exact minor units in service records", () => {
    const netflix = services.find((service) => service.slug === "netflix");
    expect(netflix?.defaultMonthlyPrice).not.toBeNull();
    const record = toServiceRecord(netflix!);
    expect(record.defaultMonthlyPrice?.amountMinor).toBe(parsePriceToMinorUnits(String(netflix!.defaultMonthlyPrice)));
    expect(Number.isInteger(record.defaultMonthlyPrice?.amountMinor)).toBe(true);
  });
});
