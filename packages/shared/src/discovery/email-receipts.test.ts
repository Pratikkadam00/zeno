import { describe, expect, it } from "vitest";
import { detectEmailReceiptCandidates } from "./email-receipts";

describe("email receipt detector", () => {
  it("detects receipt candidates without requiring email body upload", () => {
    const candidates = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Midjourney <billing@midjourney.com>",
        subject: "Your Midjourney subscription receipt for $10.00",
        snippet: "Monthly plan renewal",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.merchant).toBe("Midjourney");
    expect(candidates[0]?.billingCycle).toBe("monthly");
    expect(candidates[0]?.category).toBe("ai_tools");
  });
});
