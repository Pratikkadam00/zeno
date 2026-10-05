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
  const candidates = general
    ? [
        `General steps to cancel your ${name} subscription (difficulty: ${difficulty}), with a direct link to ${name}'s cancellation page. We haven't verified ${name}'s exact flow yet.`,
        `General steps to cancel your ${name} subscription (difficulty: ${difficulty}), with a direct link to its cancellation page. We haven't verified the exact flow yet.`,
        `General steps to cancel ${name} (difficulty: ${difficulty}), with a direct link to its cancellation page. We haven't verified the exact flow yet.`
      ]
    : [
        `Step-by-step guide to cancel your ${name} subscription (difficulty: ${difficulty}), with a direct link to the cancellation page, so you can stop before the next charge.`,
        `Step-by-step guide to cancel your ${name} subscription (difficulty: ${difficulty}), with a direct link to the cancellation page when one is available.`,
        `Step-by-step guide to cancel your ${name} subscription (difficulty: ${difficulty}), with a direct link to the cancellation page when available.`
      ];
  return candidates.find((text) => text.length <= 160) ?? candidates[candidates.length - 1]!;
}
