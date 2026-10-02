# /about — founder page brief (owner supplies the facts; nothing here may be invented)

Why: SEO.md §6.4 says YMYL niches need a real person with a real name and photo; the site today deliberately shows no social links or testimonials, which is right, and leaves the trust signal to be this one page.

## What the owner provides

1. Name as it should appear, and a photo (JPEG, ≤150 KB, 800 px on the long side).
2. One true paragraph on why Zeno refuses bank logins (the real origin story, not a positioning line).
3. Where Zeno is built (city/country) and the legal entity name once COMPLIANCE.md §8.3 is done.
4. Links to the profiles created in `deploy/owner-checklist.md` §10.

## Page structure (ContentShell, eyebrow "About")

- H1: the founder's name and "built Zeno" (e.g. "{Name} built Zeno.")
- The origin paragraph.
- "What Zeno promises", quoting the three locked onboarding lines verbatim: "No bank login required." · "Your data stays on your device" · "Warned before every charge."
- "What Zeno does not do": no bank connection, no background scanning, no selling data, no invented statistics on this site (a one-line honesty statement that the whole site already lives by).
- How to reach us: `privacy@<domain>`, `legal@<domain>`, the developers page.
- JSON-LD: add `founder: { "@type": "Person", name, url: "/about" }` to the root `Organization`; the page itself is `AboutPage` + `BreadcrumbList`.

Done when the page is in the footer, in the sitemap at 0.5, and the Organization schema names the founder.
