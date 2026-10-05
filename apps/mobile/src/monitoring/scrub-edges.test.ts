import { describe, expect, it } from "vitest";
import { redactText, redactValue } from "./redact";
import { scrubBreadcrumb, scrubEvent, scrubText, scrubValue } from "./sentry-scrub";

// P6.3: what a crash report may carry. Stryker loosened each of these patterns or
// skipped each of these paths, and no test noticed; in each case a user's amount,
// email or token would have reached Sentry. Plus the opposite edge: a number that
// is not money stays readable.

describe("redactText: tokens that must never leave the phone", () => {
  it("a bearer token after more than one space", () => {
    const out = redactText("Authorization: Bearer   abc.DEF-123_xyz");
    expect(out).toBe("Authorization: Bearer [redacted]");
  });

  it("a long token whose first digit comes after letters", () => {
    const token = "abcdefghijklmnopqrstuvwxyzABCDEF0123456789";
    expect(redactText(`refresh ${token} failed`)).toBe("refresh [redacted] failed");
  });
});

describe("redactValue: inside lists", () => {
  it("every item of an array is redacted, and it stays an array", () => {
    expect(redactValue(["me@x.com", { owner: "a@b.co" }, ["deep@c.io"]])).toEqual([
      "[redacted-email]",
      { owner: "[redacted-email]" },
      ["[redacted-email]"]
    ]);
  });
});

describe("scrubText: amounts in every form the app shows", () => {
  it.each([
    ["Rs 499 renewal", "[amount] renewal"],
    ["Rs. 99 renewal", "[amount] renewal"],
    ["Rs499 renewal", "[amount] renewal"],
    ["charged 12,499.00 INR today", "charged [amount] today"],
    ["charged 1299 USD today", "charged [amount] today"],
    ["₹1,299 due", "[amount] due"]
  ])("%s", (input, output) => {
    expect(scrubText(input)).toBe(output);
  });
});

describe("scrubValue: money-named keys only", () => {
  it("a count stays a number; a spend becomes [amount]", () => {
    expect(scrubValue({ count: 3, totalSpend: 42, items: 7, price: "15.49" })).toEqual({ count: 3, totalSpend: "[amount]", items: 7, price: "[amount]" });
  });
});

describe("scrubEvent: the log entry", () => {
  it("keeps the message and its parameters, scrubbed", () => {
    const event = scrubEvent({ logentry: { message: "Paid $15.49 for me@x.com", params: ["₹1,299", "a@b.co", 3] } });
    expect(event.logentry).toEqual({ message: "Paid [amount] for [redacted-email]", params: ["[amount]", "[redacted-email]", 3] });
  });

  it("a log entry with only a message, or only parameters, keeps just that", () => {
    expect(scrubEvent({ logentry: { message: "Paid $1" } }).logentry).toEqual({ message: "Paid [amount]" });
    expect(scrubEvent({ logentry: { params: ["$2"] } }).logentry).toEqual({ params: ["[amount]"] });
  });
});

describe("scrubBreadcrumb: only a request's URL loses its query", () => {
  it("a navigation breadcrumb's url is kept as it was (scrubbed as text, not cut)", () => {
    const crumb = scrubBreadcrumb({ category: "navigation", data: { url: "/subscription/42?tab=history" } });
    expect(crumb.data).toEqual({ url: "/subscription/42?tab=history" });
  });
});
