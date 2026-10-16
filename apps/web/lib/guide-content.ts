import type { Money } from "@zeno/shared";
import { formatPrice } from "@/lib/checkout-api";

// The parts of a cancellation guide that are true for every service, written
// once and rendered on all 509 (W5, 2026-10-16). They exist because of what
// Search Console showed after twelve days: the guides are the pages Google
// shows, and nobody clicks them. The queries were not "how do I cancel" so much
// as "if I cancel now do I keep it this month", "TunnelBear renewal", "how to
// cancel X" from someone who pays through an app store. A page with five steps
// and a link answered none of that.
//
// Every statement here is one of three things: a quotation from Apple's or
// Google's own support page (read 2026-10-16, cited inline), a fact about the
// Zeno app that app/truthfulness.test.tsx already pins elsewhere, or a
// per-service number from the catalogue. Nothing is asserted about a specific
// service's own policy, because the catalogue does not know it.
//
// Copy rules this must pass: app/copy-lint.test.tsx (no em dash, no sentence
// over 40 words, none of the banned marketing words) and the FAQPage rule that
// the schema mirrors the visible text word for word (SEO.md §4.3).

export type GuideSection = {
  heading: string;
  /** Rendered as an h3 under the section, when present. */
  /** Each one is a store's own numbered steps, then a note; both stores have both. */
  subsections?: { heading: string; steps: string[]; paragraphs: string[] }[];
  paragraphs: string[];
};

export type GuideFaq = { q: string; a: string };

/** The three billing routes, and how each one is cancelled. */
export function billingSection(name: string): GuideSection {
  return {
    heading: `Before you cancel: check how you pay ${name}`,
    paragraphs: [
      `Where the money leaves decides where you cancel. If the charge on your statement or receipt names Apple or Google, the subscription belongs to the app store, and ${name}'s own account page cannot end it. If the charge names ${name}, cancel with ${name} directly, using the steps above.`
    ],
    subsections: [
      {
        heading: "Billed through the App Store (iPhone, iPad or Mac)",
        // Apple's own wording, from its support page "If you want to cancel a
        // subscription from Apple" (support.apple.com/118428, read 2026-10-16).
        steps: [
          "In Settings, tap your name.",
          "Tap Subscriptions.",
          "Tap the subscription.",
          "Tap Cancel Subscription. You might need to scroll down to find the Cancel Subscription button."
        ],
        paragraphs: [
          "Those are Apple's own steps. On a Mac, open the App Store, click your name at the bottom of the sidebar, click Subscriptions, then click the subscription and Cancel Subscription. Apple adds two things worth knowing. If there is no Cancel button, or you see an expiration message in red text, the subscription is already cancelled. A trial you do not want to renew should be cancelled at least 24 hours before it ends."
        ]
      },
      {
        heading: "Billed through Google Play (Android)",
        // Google's own wording, from "Cancel, pause, or change a subscription on
        // Google Play" (support.google.com/googleplay/answer/7018481, read 2026-10-16).
        steps: [
          "On your Android device, go to subscriptions in Google Play.",
          "Select the subscription you want to cancel.",
          "Tap Cancel subscription.",
          "Follow the instructions."
        ],
        paragraphs: [
          "Those are Google's own steps. Google also says plainly that uninstalling the app does not cancel the subscription: the charge continues until you cancel it here."
        ]
      }
    ]
  };
}

export function afterCancelSection(name: string): GuideSection {
  return {
    heading: `What happens after you cancel ${name}`,
    paragraphs: [
      `For most subscriptions, cancelling stops the next charge and leaves the current period running to its end. You keep ${name} until the date you had already paid up to, and the confirmation screen or email states that date. For Google Play, Google says you keep access for the period you have paid for: its own example is a yearly plan bought on 1 January and cancelled on 1 July, which runs until 31 December. On Apple's Subscriptions screen, a cancelled subscription shows an expiration message in red text.`,
      "If the confirmation gives no date, the billing page usually does, as an end date in place of a next charge. Zeno keeps the renewal date for you and reminds you seven days out, three days out and on the morning of, so a cancellation made in time is one you can see coming."
    ]
  };
}

export function confirmSection(name: string): GuideSection {
  return {
    heading: `How to confirm ${name} is cancelled`,
    paragraphs: [
      "Three things prove it. A confirmation email or screen from whoever billed you. A billing page that shows an end date instead of a next charge. And a statement with no new charge after that date.",
      "In the Zeno app a cancellation counts as verified only when the renewal date passes with no new charge in the receipts or statements you scan or import. A charge that turns up anyway is flagged rather than hidden, so a cancellation that did not stick shows up as exactly that."
    ]
  };
}

export function refundsSection(name: string): GuideSection {
  return {
    heading: "Refunds",
    paragraphs: [
      `Ask whoever billed you, because that is who holds the money. If ${name} billed you directly, its own terms decide, and a charge made shortly after you meant to cancel is worth asking about. For Google Play, Google says past subscription payments are generally not refundable, with exceptions set out in its refund policies, and an unused prepaid plan can be refunded on request. For the App Store, refunds are requested from Apple through its refund request page, not from ${name}.`,
      "Cancel first, then ask. A refund that is not followed by another charge is the only kind worth having."
    ]
  };
}

/**
 * What the service usually costs, from the catalogue. The yearly figure is the
 * monthly one times twelve, shown exactly rather than rounded, and said to be a
 * reference: the catalogue holds the usual price, not this reader's plan.
 */
export function costSection(name: string, monthly?: Money, annual?: Money): GuideSection | null {
  if (!monthly) return null;
  const perMonth = formatPrice(monthly.amountMinor, "USD");
  const perYear = formatPrice(monthly.amountMinor * 12, "USD");
  const paragraphs = [
    `The usual price of ${name} is ${perMonth} a month, which is ${perYear} over a year.${annual ? ` Paid yearly it is usually ${formatPrice(annual.amountMinor, "USD")}.` : ""} Prices change and plans differ, so treat this as a reference rather than a quote; your receipt has the real figure.`
  ];
  return { heading: `What ${name} costs`, paragraphs };
}

/** Visible questions, and the FAQPage schema, from one source. */
export function guideFaqs(name: string): GuideFaq[] {
  return [
    {
      q: `Will I still have access to ${name} after I cancel?`,
      a: "Usually yes, until the end of the period you have paid for. Google states this for Google Play subscriptions, and most services billed directly work the same way. The confirmation screen or email tells you the exact date."
    },
    {
      q: `Does deleting the ${name} app cancel the subscription?`,
      a: "No. Deleting an app stops nothing. Google's own guidance says uninstalling does not cancel a Google Play subscription, and an App Store subscription is ended on Apple's Subscriptions screen, not by removing the app. Cancel first, then delete if you want to."
    },
    {
      q: `How do I know the ${name} cancellation worked?`,
      a: "Keep the confirmation email or screen, check that the billing page shows an end date rather than a next charge, and watch the next statement. If a charge appears after the end date, contact whoever billed you and quote the confirmation."
    }
  ];
}

export function guideSections(name: string, monthly?: Money, annual?: Money): GuideSection[] {
  const sections = [billingSection(name), afterCancelSection(name), confirmSection(name), refundsSection(name)];
  const cost = costSection(name, monthly, annual);
  return cost ? [...sections, cost] : sections;
}
