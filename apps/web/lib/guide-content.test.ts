import { describe, expect, it } from "vitest";
import { services, toServiceRecord } from "@zeno/service-catalog";
import { afterCancelSection, billingSection, confirmSection, costSection, guideFaqs, guideSections, refundsSection } from "./guide-content";

/**
 * The service-independent half of every cancellation guide. What matters is
 * that nothing here claims to know a specific service's policy, that the two
 * quoted sets of steps are the stores' own wording, and that the cost line
 * does arithmetic rather than rounding.
 */
const NAME = "Example Plus";

describe("the stores' own steps", () => {
  it("quotes Apple's four steps as written on its support page (read 2026-10-16)", () => {
    const apple = billingSection(NAME).subsections!.find((s) => s.heading.includes("App Store"))!;
    expect(apple.steps).toEqual([
      "In Settings, tap your name.",
      "Tap Subscriptions.",
      "Tap the subscription.",
      "Tap Cancel Subscription. You might need to scroll down to find the Cancel Subscription button."
    ]);
  });

  it("quotes Google's four steps as written on its support page (read 2026-10-16)", () => {
    const google = billingSection(NAME).subsections!.find((s) => s.heading.includes("Google Play"))!;
    expect(google.steps).toEqual([
      "On your Android device, go to subscriptions in Google Play.",
      "Select the subscription you want to cancel.",
      "Tap Cancel subscription.",
      "Follow the instructions."
    ]);
  });

  it("attributes each store's claims to the store rather than making them", () => {
    const text = JSON.stringify(billingSection(NAME)) + JSON.stringify(afterCancelSection(NAME)) + JSON.stringify(refundsSection(NAME));
    expect(text).toContain("Apple's own steps");
    expect(text).toContain("Google's own steps");
    expect(text).toContain("Google says");
    // The access-after-cancelling claim is Google's; Apple's page does not make
    // it, so the text must not put it in Apple's mouth.
    expect(afterCancelSection(NAME).paragraphs[0]).toContain("Google says you keep access");
    expect(afterCancelSection(NAME).paragraphs[0]).not.toMatch(/Apple says you keep/);
  });
});

describe("what is said about the service itself", () => {
  it("asserts nothing about the service's own policy", () => {
    const text = guideSections(NAME).flatMap((s) => [...s.paragraphs, ...(s.subsections ?? []).flatMap((x) => x.paragraphs)]).join(" ");
    // The service's name appears only in sentences that defer to it or to
    // whoever billed you, never as "Example Plus refunds" or "Example Plus lets you".
    expect(text).not.toMatch(/Example Plus (refunds|lets you|allows|gives you|offers)/);
    expect(text).toContain("its own terms decide");
  });

  it("uses the Zeno facts the home page already pins: three reminders, and what verified means", () => {
    expect(afterCancelSection(NAME).paragraphs[1]).toContain("seven days out, three days out and on the morning of");
    expect(confirmSection(NAME).paragraphs[1]).toContain("verified only when the renewal date passes with no new charge");
  });
});

describe("the cost line", () => {
  it("multiplies rather than rounds, and says it is a reference", () => {
    const section = costSection(NAME, { amountMinor: 999, currency: "USD" })!;
    expect(section.paragraphs[0]).toContain("$9.99 a month, which is $119.88 over a year");
    expect(section.paragraphs[0]).toContain("reference rather than a quote");
    expect(section.paragraphs[0]).not.toContain("$120");
  });

  it("names the yearly plan when the catalogue has one", () => {
    const section = costSection(NAME, { amountMinor: 999, currency: "USD" }, { amountMinor: 9900, currency: "USD" })!;
    expect(section.paragraphs[0]).toContain("Paid yearly it is usually $99.00.");
  });

  it("is absent when the catalogue has no price, rather than inventing one", () => {
    expect(costSection(NAME)).toBeNull();
    expect(guideSections(NAME).map((s) => s.heading)).not.toContain(`What ${NAME} costs`);
  });

  it("renders a cost section for every catalogue service that has a price, and for none without", () => {
    for (const service of services) {
      const record = toServiceRecord(service);
      const sections = guideSections(record.name, record.defaultMonthlyPrice, record.defaultAnnualPrice);
      const hasCost = sections.some((s) => s.heading === `What ${record.name} costs`);
      expect(hasCost, record.name).toBe(Boolean(record.defaultMonthlyPrice));
    }
  });
});

describe("the questions", () => {
  it("are three, each naming the service, with plain-text answers for the FAQ schema", () => {
    const faqs = guideFaqs(NAME);
    expect(faqs).toHaveLength(3);
    for (const { q, a } of faqs) {
      expect(q).toContain(NAME);
      expect(q.endsWith("?")).toBe(true);
      expect(a).not.toMatch(/<|&[a-z]+;/);
    }
  });

  it("answers the question Search Console actually showed: access after cancelling", () => {
    expect(guideFaqs(NAME)[0]!.a).toContain("until the end of the period you have paid for");
  });
});

describe("house style, for every service name in the catalogue", () => {
  const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z"“])/).map((s) => s.trim()).filter(Boolean);
  const words = (s: string) => s.split(/\s+/).length;

  it("no sentence over 40 words, no em dash, no double space, whatever the name's length", () => {
    for (const service of services) {
      const record = toServiceRecord(service);
      const texts = [
        ...guideSections(record.name, record.defaultMonthlyPrice, record.defaultAnnualPrice).flatMap((s) => [
          s.heading,
          ...s.paragraphs,
          ...(s.subsections ?? []).flatMap((x) => [x.heading, ...x.paragraphs, ...x.steps])
        ]),
        ...guideFaqs(record.name).flatMap((f) => [f.q, f.a])
      ];
      for (const text of texts) {
        expect(text, `${record.name}: ${text.slice(0, 60)}`).not.toMatch(/—|  | [,.;:!?]/);
        for (const s of sentences(text)) expect(words(s), `${record.name}: ${s.slice(0, 60)}`).toBeLessThanOrEqual(40);
      }
    }
  });
});
