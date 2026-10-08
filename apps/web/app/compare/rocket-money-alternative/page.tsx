import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = pageMetadata({
  title: "Rocket Money alternative, no bank login needed",
  description:
    "Rocket Money links your accounts through Plaid. Zeno finds and tracks subscriptions from email receipts and statement imports instead. No bank login required.",
  path: "/compare/rocket-money-alternative"
});

export default function RocketMoneyComparePage() {
  return (
    <ContentShell
      eyebrow="Rocket Money alternative"
      title="A Rocket Money alternative that doesn't use Plaid"
      lead="Rocket Money links your accounts through Plaid, the bank-data aggregator many finance apps use. Your credentials go to Plaid, and Rocket Money reads the transactions back. Zeno does not ask for a bank connection at all."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Rocket Money alternative", item: siteUrl("/compare/rocket-money-alternative") }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Rocket Money"
        rows={[
          { feature: "Bank connection method", zeno: "None required. Email or statement import, or manual entry", competitor: "Plaid (per Rocket Money's own help center)" },
          { feature: "Sees your bank login", zeno: "Never", competitor: "Passed to Plaid, not stored by Rocket Money directly" },
          { feature: "One-time purchase option", zeno: "Yes", competitor: "Subscription-only" },
          { feature: "Where your subscription data lives", zeno: "Encrypted on your device", competitor: "Synced to their servers" }
        ]}
      />

      <p>
        This is not a claim that Plaid is unsafe. It is a well-established aggregator used across the industry. Zeno simply does
        not need it. Catching a forgotten renewal, a price rise or a trial about to convert works from data you already have: a
        statement export or an email receipt. No bank-credential step is added.
      </p>

      <h2>Related</h2>
      <ul className={styles.list}>
        <li>
          <Link href="/compare">All comparisons</Link>
        </li>
        <li>
          <Link href="/cancel-subscriptions">Cancel subscriptions, with the charge checked</Link>
        </li>
        <li>
          <Link href="/compare/no-bank-login">A subscription tracker without bank login</Link>
        </li>
      </ul>
      <ComparePageCta title="Find and cancel subscriptions without linking a bank account" />
    </ContentShell>
  );
}
