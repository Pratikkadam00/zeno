import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = pageMetadata({
  title: "Monarch alternative with no bank sync to break",
  description:
    "Monarch Money's budgeting runs on bank connections. Zeno tracks subscriptions and a monthly budget from statement imports and manual entry, with no bank sync.",
  path: "/compare/monarch-alternative"
});

export default function MonarchComparePage() {
  return (
    <ContentShell
      eyebrow="Monarch alternative"
      title="A Monarch alternative with no bank sync to break"
      lead="Monarch Money's budgeting and net-worth tracking are built around live bank account connections. Zeno does a narrower job: subscription tracking and a monthly budget, built from statement imports and manual entry. There is no live connection to drop, ask for re-authentication, or leave a gap in your history."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Monarch alternative", item: siteUrl("/compare/monarch-alternative") }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Monarch Money"
        rows={[
          { feature: "Starting annual price", zeno: "$29.99/yr (or a one-time $79.99, ever)", competitor: "$99.99/yr (Monarch's own pricing page)" },
          { feature: "Built around live bank connections", zeno: "No. Imports and manual entry", competitor: "Yes. Automatic tracking runs on linked accounts" },
          { feature: "One-time purchase option", zeno: "Yes", competitor: "Subscription-only" },
          { feature: "What happens if a bank connection breaks", zeno: "Nothing to break. Import a new statement any time", competitor: "Requires re-linking; can gap your data until fixed" }
        ]}
      />

      <p>
        Monarch is built for a broader job: net worth, investments, full cash-flow budgeting. That is why it leans on continuous
        bank connectivity. If what you want is to stop paying for subscriptions you forgot about and keep a simple monthly cap,
        that broader machinery is a lot of surface area, and cost, for the job.
      </p>

      <p style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>
        Competitor pricing read from Monarch&rsquo;s public pricing page on 8 October 2026. Prices can change; check their
        site for the current figure.
      </p>

      <ComparePageCta title="Track subscriptions and a budget without a live bank connection" />
    </ContentShell>
  );
}
