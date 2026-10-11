import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The terms must describe the channel the website actually sells through.
 *
 * Finding F241. Today every purchase goes through Apple or Google, and the
 * terms say so: §6 "sold and billed by Apple … or Google", §7 "Refunds are
 * requested from the store you bought from". That is accurate right now, which
 * is exactly why it has not been rewritten — a description of direct sales
 * would be false until the checkout exists.
 *
 * The day it does exist, those sentences become false for every buyer who used
 * it: Zeno is the seller, Razorpay is only the processor, and the refund
 * obligation is ours. Nobody will remember a paragraph of legal text while
 * shipping a payment page, so this test remembers instead: the moment a
 * checkout page appears, the terms have to have caught up (D25).
 */
const ROOT = join(__dirname, "..");
const TERMS = join(ROOT, "apps/web/app/legal/terms/page.tsx");

/** Where the website's checkout will live. Any of these means we sell direct. */
const CHECKOUT_PAGES = ["apps/web/app/pro/page.tsx", "apps/web/app/upgrade/page.tsx", "apps/web/app/checkout/page.tsx"];

/** Sentences that are only true while the stores are the only sellers. */
const STORE_ONLY_CLAIMS = [
  "Refunds are requested from the store you bought from",
  "the stores handle payment",
  "is exercised through the store"
];

const checkoutExists = () => CHECKOUT_PAGES.filter((page) => existsSync(join(ROOT, page)));

describe("F241: the terms keep up with how Zeno sells", () => {
  it("has not quietly lost the sentences this guard watches", () => {
    // If the terms are reworded, this test must be re-read rather than silently
    // passing because its needles no longer exist.
    const terms = readFileSync(TERMS, "utf8");
    const present = STORE_ONLY_CLAIMS.filter((claim) => terms.includes(claim));
    expect(
      present.length > 0 || checkoutExists().length > 0,
      "None of the store-only claims are in the terms any more. If they were rewritten for " +
        "direct sales, update this guard (and close F241); if they were merely moved, point it at the new wording."
    ).toBe(true);
  });

  it("does not claim the store handles refunds once the website sells directly", () => {
    const pages = checkoutExists();
    if (pages.length === 0) return; // nothing is sold on the website yet
    const terms = readFileSync(TERMS, "utf8");
    const stale = STORE_ONLY_CLAIMS.filter((claim) => terms.includes(claim));
    expect(
      stale,
      `${pages.join(", ")} sells directly, so Zeno is the seller and owes the refund. ` +
        `These sentences in the terms are now false for a buyer who used it (F241, D25):\n${stale.join("\n")}`
    ).toEqual([]);
  });

  it("publishes a refund policy once the website sells directly", () => {
    if (checkoutExists().length === 0) return;
    const policy = ["apps/web/app/legal/refunds/page.tsx", "apps/web/app/legal/refund-policy/page.tsx"];
    expect(
      policy.some((page) => existsSync(join(ROOT, page))),
      "A site that takes payment needs a published refund and cancellation policy — Razorpay's own review expects one (D25)."
    ).toBe(true);
  });
});
