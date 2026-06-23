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

  it("extracts amounts in minor units from dollar and USD formats", () => {
    const candidates = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Adobe <message@adobe.com>",
        subject: "Your Adobe invoice",
        snippet: "We charged $54.99 for your plan.",
        receivedAt: "2026-05-24T00:00:00.000Z"
      },
      {
        provider: "outlook",
        sender: "Notion <billing@notion.so>",
        subject: "Notion subscription receipt",
        snippet: "Payment received: USD 96.00 per year",
        receivedAt: "2026-05-23T00:00:00.000Z"
      }
    ]);

    expect(candidates).toHaveLength(2);
    const adobe = candidates.find((candidate) => candidate.merchant === "Adobe");
    const notion = candidates.find((candidate) => candidate.merchant === "Notion");
    expect(adobe?.amountMinor).toBe(5499);
    expect(adobe?.currency).toBe("USD");
    expect(notion?.amountMinor).toBe(9600);
    expect(notion?.billingCycle).toBe("annual");
  });

  it("extracts whole-dollar amounts without a decimal part", () => {
    const candidates = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "OpenAI <noreply@tm.openai.com>",
        subject: "ChatGPT Plus payment receipt",
        snippet: "Amount charged: $20",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.amountMinor).toBe(2000);
  });

  it("ignores emails without billing language", () => {
    const candidates = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Newsletter <hello@example.com>",
        subject: "Weekly design links",
        snippet: "Ten great reads, plus a $5 coffee recommendation.",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);

    expect(candidates).toHaveLength(0);
  });

  it("ignores billing-flavored emails that contain no amount", () => {
    const candidates = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Spotify <no-reply@spotify.com>",
        subject: "Your subscription settings changed",
        snippet: "Manage your plan from account settings.",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);

    expect(candidates).toHaveLength(0);
  });

  // The Rocket Money gap: App Store / Play Store subscriptions are billed by
  // Apple/Google, not the app, so they're invisible to bank-linking trackers.
  it("surfaces an App Store subscription and names the underlying app", () => {
    const [candidate] = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Apple <no_reply@email.apple.com>",
        subject: "Your receipt from Apple",
        snippet: "Disney+ (Monthly) $13.99 Subscription Renewal",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);
    expect(candidate?.billedThrough).toBe("app_store");
    expect(candidate?.merchant).toBe("Disney+");
    expect(candidate?.amountMinor).toBe(1399);
    expect(candidate?.billingCycle).toBe("monthly");
    expect(candidate?.category).toBe("entertainment");
  });

  it("flags a Play Store receipt even without explicit billing words", () => {
    const [candidate] = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Google Play <googleplay-noreply@google.com>",
        subject: "Your Google Play Order Receipt",
        snippet: "Duolingo (1 Year) $83.99",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);
    expect(candidate?.billedThrough).toBe("play_store");
    expect(candidate?.merchant).toBe("Duolingo");
    expect(candidate?.billingCycle).toBe("annual");
  });

  it("still surfaces a store receipt whose app name can't be parsed", () => {
    const [candidate] = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Apple <no_reply@email.apple.com>",
        subject: "Your receipt from Apple",
        snippet: "Auto-renewing subscription $4.99",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);
    expect(candidate?.billedThrough).toBe("app_store");
    expect(candidate?.merchant).toBe("App Store subscription");
  });

  it("treats a generic Google service receipt as direct, not Play Store", () => {
    const [candidate] = detectEmailReceiptCandidates([
      {
        provider: "gmail",
        sender: "Google <payments-noreply@google.com>",
        subject: "Your Google One receipt",
        snippet: "Google One subscription renewal $1.99 monthly",
        receivedAt: "2026-05-24T00:00:00.000Z"
      }
    ]);
    // Only the Play-specific sender / "Google Play" text counts as a store biller.
    expect(candidate?.billedThrough).toBe("direct");
    expect(candidate?.amountMinor).toBe(199);
  });
});
