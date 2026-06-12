import { describe, expect, it } from "vitest";
import { findServiceBySlug, searchServices, services } from "./index";

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
