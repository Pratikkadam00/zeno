import { describe, expect, it, vi } from "vitest";

// The entry point only loads .env and starts the server once with the real
// dependencies; everything else is in start.ts (start.test.ts).
const startServer = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("./start", () => ({ startServer }));
vi.mock("dotenv/config", () => ({}));

describe("server entry point", () => {
  it("starts the server exactly once, with default dependencies", async () => {
    await import("./server");
    expect(startServer).toHaveBeenCalledTimes(1);
    expect(startServer).toHaveBeenCalledWith();
  });
});
