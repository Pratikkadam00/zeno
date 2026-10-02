# Cancel-URL audit of the 204 curated catalog entries, 2026-10-01

Method: the 204 `requestedRows` in `packages/service-catalog/src/services.ts` (the "curated" half; the other 305 `expansionRows` are the F25 guessed `<website>/account` links and were not fetched) had their `cancelUrl` fetched with `curl -L` and a desktop Chrome user agent on 2026-10-01. Status counts:

| HTTP | Count | Meaning |
|---|---|---|
| 200 | 122 | page served to a logged-out visitor |
| 302 | 1 | redirect not followed to a 200 |
| 401 | 2 | login required (SoundCloud, Postman) |
| 403 | 22 | bot block or login wall; cannot tell which from here (OpenAI, Midjourney, Perplexity, NordVPN, Surfshark, Calm, Paramount+, ...) |
| 404 | 53 | **the URL does not exist for a logged-out visitor** |
| 406 | 2 | Hulu, iHeart (server refused the request) |
| 429 | 1 | Leonardo (rate limited) |
| 000 | 1 | McAfee (connection failed) |

The 53 x 404 list is in the session log (`GROWTH_LOG.md`, entry 2026-10-01). Highlights that are almost certainly wrong rather than auth-gated, because the service's public help page names a different URL:

| Slug | Catalog cancelUrl (404) | What the service's own page says (verified today) |
|---|---|---|
| notion | notion.so/profile/billing | not fetched; Notion's billing lives inside the workspace settings, not a public path |
| max | max.com/account/subscription | help.max.com 301s to help.hbomax.com (brand reverted to HBO Max); page read in browser pane, see `content/cancel-guides/top-20-verified.md` |
| youtube-premium | (catalog uses myaccount.google.com payments page, 200) | YouTube's own page says youtube.com/paid_memberships |
| chatgpt-plus | chat.openai.com/account/billing (403) | the product is chatgpt.com; OpenAI help: Settings > My plan > Manage subscription |
| github-pro | github.com/settings/billing (404 logged out) | correct when logged in; 404 is GitHub's logged-out behaviour. Keep. |
| nintendo-switch-online | accounts.nintendo.com/subscription (404) | needs a manual check |
| ea-play-pro, nike-training-club, quicken, slack-pro, strava-premium, headspace, skillshare, playstation-plus | all 404 | needs a manual check each |

What this means for marketing: **even the "curated" half of the catalog has unverified links.** Until the engineering session re-verifies them, no public copy may call the guides "verified". The homepage Exhibit A caption currently reads "each with real, step-by-step cancellation instructions" for all 509 services; 305 of them have generic steps (F25). That caption is a truthfulness bug on the live site and is logged as an owner item in `GROWTH_LOG.md`.

Raw output: `/tmp/curated_status.txt` from this session (not committed; re-run with the command in `GROWTH_LOG.md` to reproduce).
