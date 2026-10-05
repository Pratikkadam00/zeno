import { isGeneralCancelGuide, serviceRecords, services } from "@zeno/service-catalog";
import { describe, expect, it } from "vitest";
import { LANDINGS, findLanding, landingText } from "./landings";

// The landing pages' data, in the logic run (the pages themselves are held to the
// copy rules in apps/web/app/landings.test.tsx, the website's own run).
describe("landings", () => {
  it("states the real catalogue counts", () => {
    const researched = serviceRecords.filter((s) => !isGeneralCancelGuide(s.name, s.cancellationGuideSteps)).length;
    const cancel = findLanding("/cancel-subscriptions");
    expect(landingText(cancel)).toContain(`For ${researched} of them`);
    expect(cancel.description).toContain(`cancel ${services.length} subscriptions`);
  });

  it("landingText reads every heading, paragraph, list item, closing note, question and answer", () => {
    const trial = findLanding("/free-trial-reminders");
    const text = landingText(trial);
    for (const piece of [trial.h1, trial.lead, trial.cta, ...trial.faqs.flatMap((f) => [f.q, f.a])]) expect(text).toContain(piece);
    for (const section of trial.sections) {
      expect(text).toContain(section.heading);
      for (const piece of [...(section.paragraphs ?? []), ...(section.list ?? []), ...(section.after ?? [])]) expect(text).toContain(piece);
    }
  });

  it("every page has three related links and at least four questions", () => {
    for (const l of LANDINGS) {
      expect(l.related, l.path).toHaveLength(3);
      expect(l.faqs.length, l.path).toBeGreaterThanOrEqual(4);
    }
  });

  it("finds a page by path, and refuses an unknown one", () => {
    expect(findLanding("/budgeting").path).toBe("/budgeting");
    expect(() => findLanding("/nope")).toThrow("No landing page for /nope");
  });
});
