import type { Metadata } from "next";
import { services } from "@zeno/service-catalog";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

const SERVICE_COUNT = services.length;

export const metadata: Metadata = {
  title: "A budget app that doesn't connect to your bank | Zeno",
  description: "Zeno tracks subscriptions and a monthly budget from email receipts, statement imports, and manual entry — no bank connection required, and no sync that breaks when your bank changes its login flow.",
  alternates: { canonical: "/compare/budget-app-no-bank-sync" },
  openGraph: {
    title: "A budget app that doesn't connect to your bank | Zeno",
    description: "Track subscriptions and a monthly budget without a bank connection that can break.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function BudgetAppNoBankSyncComparePage() {
  return (
    <ContentShell
      eyebrow="Budget app that doesn't connect to your bank"
      title="A budget app that doesn't need to connect to your bank"
      lead="Bank-synced budget apps are only as reliable as their bank connection — and connections break: a bank changes its login flow, adds two-factor prompts, or drops support for an aggregator, and suddenly your budget history has gaps. Zeno's budget tracking runs on what you import or enter yourself, so there's no sync to break."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "Budget app without bank sync", item: "https://zeno.app/compare/budget-app-no-bank-sync" }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Most bank-synced budget apps"
        rows={[
          { feature: "Bank account connection required", zeno: "No", competitor: "Yes, for automatic transaction sync" },
          { feature: "Can break when your bank changes login", zeno: "Nothing to break — no live connection", competitor: "Yes — a common source of gaps in your history" },
          { feature: "CSV / statement import supported", zeno: "Yes — several major bank export formats", competitor: "Varies" },
          { feature: "Manual entry supported", zeno: `Yes, with a ${SERVICE_COUNT}+ service catalog for autofill`, competitor: "Varies, often an afterthought" }
        ]}
      />

      <p>
        A monthly budget cap, category budgets, and envelopes all work in Zeno from subscriptions you&rsquo;ve imported or added
        manually — no ongoing bank connection to maintain, re-authenticate, or lose data to when it inevitably breaks.
      </p>

      <ComparePageCta title="Budget without a bank connection that can break" />
    </ContentShell>
  );
}
