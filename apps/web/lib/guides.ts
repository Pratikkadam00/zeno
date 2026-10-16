/**
 * D16 (docs/OWNER_ACTIONS.md): whether the general-step cancellation guides
 * (470 of 509: the same five steps with the service's name filled in, F171)
 * are offered to search engines. `true` lists them in the sitemap at a lower
 * priority and lets them be indexed; `false` keeps them on the site and
 * linked, but marks them noindex and leaves them out of the sitemap, until
 * each gets steps written for its service. One switch, so the decision is a
 * one-line change either way.
 */
export const INDEX_GENERAL_GUIDES = true;

/**
 * A guide's search description, 140 to 160 characters for every service in the
 * catalogue (SEO.md §3.2; seo.test.ts checks all of them): the first wording that
 * fits, longest first, since service names run from 2 to 30-odd characters. A
 * general guide says so (F171). Each claim is one the guide page makes: the
 * difficulty, the service's own cancellation link, and that Zeno tracks the
 * renewal date so you can cancel before the next charge.
 */
export function guideDescription(name: string, difficulty: string, general: boolean): string {
  // 2026-10-16: Search Console showed the guides earning impressions and no
  // clicks. The old general-guide description led with what the page had NOT
  // done ("We haven't verified the exact flow yet"), which is honest and is
  // also the one line nobody chooses from a results page. It still says
  // "General steps", as it must (F171, seo.test.tsx), and then says what the
  // page does answer: the store paths, access after cancelling, confirmation.
  const candidates = general
    ? [
        `General steps to cancel ${name}, with its website, the App Store and Google Play cancellation paths, what happens to your access, and how to confirm it stopped.`,
        `General steps to cancel ${name}, the App Store and Google Play cancellation paths, what happens to your access, and how to confirm it stopped.`,
        `General steps to cancel ${name}, the App Store and Google Play paths, what happens to your access, and how to confirm it stopped.`
      ]
    : [
        `Step-by-step guide to cancel your ${name} subscription (difficulty: ${difficulty}), the App Store and Google Play paths, what happens to your access, and how to confirm it.`,
        `Step-by-step guide to cancel ${name} (difficulty: ${difficulty}), the App Store and Google Play paths, what happens to your access, and how to confirm it stopped.`,
        `Step-by-step guide to cancel ${name} (difficulty: ${difficulty}), the App Store and Google Play paths, your access afterwards, and how to confirm it.`,
        `Step-by-step guide to cancel ${name} (${difficulty}), the App Store and Google Play paths, your access afterwards, and how to confirm it.`
      ];
  return candidates.find((text) => text.length <= 160) ?? candidates[candidates.length - 1]!;
}

/**
 * F242 (2026-10-16): an expansion-row service's cancellation link is a guess,
 * `<website>/account` (F25). A 14-link sample of them: four 404s, one 403, the
 * rest redirects to who knows where. A guide links that address only when it
 * was written by a person; a guessed one is replaced by the homepage, which is
 * the one address the catalogue knows is right.
 */
export function isGuessedCancelUrl(website: string, cancellationUrl: string | undefined): boolean {
  return cancellationUrl === `${website.replace(/\/$/, "")}/account`;
}
