import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { services } from "@zeno/service-catalog";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

const SERVICE_COUNT = services.length;

export const metadata: Metadata = pageMetadata({
  title: "A budget app that doesn't connect to your bank",
  description:
    "Zeno tracks subscriptions and a monthly budget from email receipts, statement imports and manual entry. No bank connection, and no sync that can break.",
  path: "/compare/budget-app-no-bank-sync"
});

export default function BudgetAppNoBankSyncComparePage() {
  return (
    <ContentShell
      eyebrow="Budget app that doesn't connect to your bank"
      title="A budget app that doesn't need to connect to your bank"
      lead="A bank-synced budget app is only as reliable as its bank connection, and connections break. A bank changes its login flow, adds a two-factor prompt, or drops an aggregator, and your budget history has a gap. Zeno's budget runs on what you import or enter yourself, so there is no sync to break."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Budget app without bank sync", item: siteUrl("/compare/budget-app-no-bank-sync") }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Most bank-synced budget apps"
        rows={[
          { feature: "Bank account connection required", zeno: "No", competitor: "Yes, for automatic transaction sync" },
          { feature: "Can break when your bank changes login", zeno: "Nothing to break: no live connection", competitor: "Yes, a common source of gaps in your history" },
          { feature: "CSV / statement import supported", zeno: "Yes, several major bank export formats", competitor: "Varies" },
          { feature: "Manual entry supported", zeno: `Yes, with a ${SERVICE_COUNT}+ service catalog for autofill`, competitor: "Varies, often an afterthought" }
        ]}
      />

      <p>
        A monthly budget cap, category budgets, and envelopes all work in Zeno from subscriptions you&rsquo;ve imported or added
        manually. There is no bank connection to maintain, re-authenticate, or lose data to when it breaks.
      </p>

      <h2>Related</h2>
      <ul className={styles.list}>
        <li>
          <Link href="/budgeting">Budgeting without bank sync, in detail</Link>
        </li>
        <li>
          <Link href="/compare/no-bank-login">A subscription tracker without bank login</Link>
        </li>
        <li>
          <Link href="/blog/how-to-find-all-your-subscriptions">How to find every subscription you&rsquo;re paying for</Link>
        </li>
      </ul>
      <ComparePageCta title="Budget without a bank connection that can break" />
    </ContentShell>
  );
}
