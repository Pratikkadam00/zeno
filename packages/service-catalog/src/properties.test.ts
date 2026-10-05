import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { searchServices, services } from "./index";

// P6.4: catalogue search, for any query fast-check makes up, and for every entry.
describe("searchServices", () => {
  it("never throws, returns at most the limit, and never the same service twice", () => {
    fc.assert(fc.property(fc.string({ maxLength: 40 }), fc.integer({ min: 1, max: 30 }), (query, limit) => {
      const found = searchServices(query, limit);
      expect(found.length).toBeLessThanOrEqual(limit);
      expect(new Set(found.map((s) => s.id)).size).toBe(found.length);
    }), { numRuns: 500 });
  });

  it("searching any service's exact name finds a service of that exact name first, in any letter case", () => {
    for (const service of services) {
      for (const query of [service.name, service.name.toUpperCase()]) {
        expect(searchServices(query, 1)[0]?.name.toLowerCase(), query).toBe(service.name.toLowerCase());
      }
    }
  });
});
