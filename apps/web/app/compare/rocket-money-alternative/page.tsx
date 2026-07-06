import type { Metadata } from "next";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = {
  title: "Rocket Money alternative without Plaid | Zeno",
  description: "Rocket Money connects to your accounts through Plaid. Zeno finds and tracks subscriptions from email receipts and statement imports instead — no bank login, no Plaid, ever.",
  alternates: { canonical: "/compare/rocket-money-alternative" },
  openGraph: {
    title: "Rocket Money alternative without Plaid | Zeno",
    description: "Rocket Money connects through Plaid. Zeno doesn't need a bank connection at all.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function RocketMoneyComparePage() {
  return (
    <ContentShell
      eyebrow="Rocket Money alternative"
      title="A Rocket Money alternative that doesn't use Plaid"
      lead="Rocket Money links your accounts through Plaid, the same bank-data aggregator used by many finance apps — your credentials go to Plaid, and Rocket Money reads the transactions back. Zeno takes a different path: it never asks for a bank connection at all."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "Rocket Money alternative", item: "https://zeno.app/compare/rocket-money-alternative" }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Rocket Money"
        rows={[
          { feature: "Bank connection method", zeno: "None required — email/statement import or manual entry", competitor: "Plaid (per Rocket Money's own help center)" },
          { feature: "Sees your bank login", zeno: "Never", competitor: "Passed to Plaid, not stored by Rocket Money directly" },
          { feature: "One-time purchase option", zeno: "Yes", competitor: "Subscription-only" },
          { feature: "Where your subscription data lives", zeno: "Encrypted on your device", competitor: "Synced to their servers" }
        ]}
      />

      <p>
        This isn&rsquo;t a claim that Plaid itself is unsafe — it&rsquo;s a well-established aggregator used across the industry.
        It&rsquo;s that Zeno doesn&rsquo;t need it: the same subscription-finding job (catching a forgotten renewal, a price hike,
        a free trial about to convert) works from data you already have — a bank statement export or an email receipt — without
        adding a bank-credential step at all.
      </p>

      <ComparePageCta title="Find and cancel subscriptions without linking a bank account" />
    </ContentShell>
  );
}
