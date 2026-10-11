import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ProPrices } from "./ProPrices";
import styles from "@/components/site/content.module.css";

// D24 (docs/OWNER_ACTIONS.md): Pro is also sold here, because Google Play
// requires its own billing only for purchases made INSIDE the app. What this
// page offers is whatever the API has a configured price for — nothing is
// written into the page, so a price is an environment change on the server and
// this page follows. With no prices set, it offers nothing and says where Pro
// can be bought instead, which is the honest state and today's.
//
// The page is prerendered, like every page here: that is what lets
// scripts/csp-script-hashes.mjs give it a policy naming its own inline
// scripts, and e2e requires every route to have one. The prices therefore
// arrive client-side from our own origin (ProPrices), which also means a
// price change needs no rebuild.
//
// The purchase flow itself (sign in, Razorpay Checkout) lands with the keys
// that make it testable; until then this page never shows a button that cannot
// work. docs/RAZORPAY_WEB_CHECKOUT.md has the order of work.
export const metadata: Metadata = pageMetadata({
  title: "Get Zeno Pro",
  description:
    "Buy Zeno Pro directly: one payment, no renewal, no bank login. What Pro adds to the free plan, what it costs, and how the free plan already covers most people.",
  path: "/pro"
});

// Shown whatever is for sale: the reason to pay, not the price.
const PRO_INCLUDES = [
  "Unlimited subscriptions. The free plan tracks ten, which is where most people stop.",
  "Category budgets, so a month's subscriptions sit inside a number you chose.",
  "The AI spend coach, off until you turn it on, and never sent anything you have not agreed to.",
  "Everything the free plan does: renewal reminders, cancellation guides with verification, and the insights."
] as const;

export default function ProPage() {
  return (
    <ContentShell
      eyebrow="Pro"
      title="Get Zeno Pro"
      lead="Zeno's free plan is not a trial: it tracks ten subscriptions, needs no card, and stays free. Pro removes the limit and adds budgets and the spend coach."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Pro", item: siteUrl("/pro") }
          ]
        }}
      />

      <h2>What Pro adds</h2>
      <ul className={styles.list}>
        {PRO_INCLUDES.map((line) => (
          <li key={line}>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <ProPrices />

      <h2>What the free plan already covers</h2>
      <p>
        Ten subscriptions, the reminders seven and three days before a renewal, the cancellation guides, and the insights, with no
        card and no time limit. Most people never reach the limit. The <Link href="/features">features page</Link> lists everything the app
        does, and <Link href="/compare/no-bank-login">no bank login</Link> explains the part that makes Zeno different: it finds
        subscriptions from receipts and statements you control, never from a bank login.
      </p>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
