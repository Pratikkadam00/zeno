// W4 (docs/WEB_PLAN.md): every page's own share card, drawn by
// scripts/site-art.ts from this table into public/og/<slug>.png. The title on
// the card is the page's own title, held equal by app/art.test.tsx so the two
// cannot drift. A page not in this table shares the site-wide card (/og.png).

import { services } from "@zeno/service-catalog";

export type OgPage = { title: string; eyebrow: string };

export const OG_PAGES: Record<string, OgPage> = {
  "/": { title: "Know what you pay. Cancel before it charges.", eyebrow: "Subscription tracker for iOS and Android" },
  "/subscription-tracker": { title: "A subscription tracker that starts from your receipts, not your bank login", eyebrow: "Subscription tracker" },
  "/cancel-subscriptions": { title: "Cancel the subscriptions you don't use, and make sure they stay cancelled", eyebrow: "Cancel subscriptions" },
  "/free-trial-reminders": { title: "Free trial reminders that arrive before the charge, not after", eyebrow: "Free trial reminders" },
  "/budgeting": { title: "Budgeting for people who gave up on budgeting apps", eyebrow: "Budgeting without bank sync" },
  "/features": { title: "What Zeno does", eyebrow: "Features" },
  "/features/family-vault": { title: "One household ledger, without sharing your list", eyebrow: "Family Vault" },
  "/features/spend-twin": { title: "Your subscription total, as things you already know the price of", eyebrow: "Spend Twin" },
  "/roadmap": { title: "What is planned, and what is not here yet", eyebrow: "Roadmap" },
  "/about": { title: "Who makes Zeno, and why", eyebrow: "About" },
  "/compare": { title: "How Zeno compares", eyebrow: "Comparisons" },
  "/compare/no-bank-login": { title: "A subscription tracker that never asks for your bank login", eyebrow: "Compare" },
  "/compare/rocket-money-alternative": { title: "A Rocket Money alternative that doesn't use Plaid", eyebrow: "Compare" },
  "/compare/monarch-alternative": { title: "A Monarch alternative with no bank sync to break", eyebrow: "Compare" },
  "/compare/ynab-alternative": { title: "A YNAB alternative you pay for once", eyebrow: "Compare" },
  "/compare/budget-app-no-bank-sync": { title: "A budget app that doesn't need to connect to your bank", eyebrow: "Compare" },
  "/cancel": { title: `How to cancel ${services.length}+ subscriptions`, eyebrow: "Cancellation guides" },
  "/blog": { title: "Subscriptions, written down plainly", eyebrow: "The Zeno blog" },
  "/legal/privacy": { title: "Privacy Policy", eyebrow: "Legal" },
  "/legal/terms": { title: "Terms of Service", eyebrow: "Legal" },
  "/legal/cookies": { title: "Cookie Policy", eyebrow: "Legal" }
};

/** "/compare/no-bank-login" → "compare-no-bank-login"; "/" → "home". */
export function ogSlug(path: string): string {
  return path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
}

/** The page's own card, or null when it shares the site-wide one. Posts pass their own path. */
export function ogImageFor(path: string): string | null {
  if (OG_PAGES[path] || path.startsWith("/blog/")) return `/og/${ogSlug(path)}.png`;
  return null;
}
