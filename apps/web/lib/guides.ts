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
