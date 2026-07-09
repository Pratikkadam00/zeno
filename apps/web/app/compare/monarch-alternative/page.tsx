import type { Metadata } from "next";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = {
  title: "Monarch alternative — no bank sync to break | Zeno",
  description: "Monarch Money's budgeting runs on live bank-account connections. Zeno tracks subscriptions and a monthly budget from statement imports and manual entry — nothing that requires an ongoing bank sync.",
  alternates: { canonical: "/compare/monarch-alternative" },
  openGraph: {
    title: "Monarch alternative — no bank sync to break | Zeno",
    description: "No live bank connection to maintain or lose data to when it breaks.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function MonarchComparePage() {
  return (
    <ContentShell
      eyebrow="Monarch alternative"
      title="A Monarch alternative with no bank sync to break"
      lead="Monarch Money's budgeting and net-worth tracking depend on real-time bank account connections staying up. Zeno takes a narrower, more reliable job: subscription tracking and a monthly budget, built from statement imports and manual entry — so there's no live sync connection that can drop, need re-authentication, or leave gaps in your history."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "Monarch alternative", item: "https://zeno.app/compare/monarch-alternative" }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Monarch Money"
        rows={[
          { feature: "Starting annual price", zeno: "$29.99/yr (or a one-time $79.99, ever)", competitor: "~$99/yr (Monarch's own pricing page)" },
          { feature: "Live bank connection required", zeno: "No", competitor: "Yes — core to how it tracks net worth and spend" },
          { feature: "One-time purchase option", zeno: "Yes", competitor: "Subscription-only" },
          { feature: "What happens if a bank connection breaks", zeno: "Nothing to break — re-import a statement anytime", competitor: "Requires re-linking; can gap your data until fixed" }
        ]}
      />

      <p>
        Monarch is built for a broader job — net worth, investments, full cash-flow budgeting — which is exactly why it needs
        continuous bank connectivity. If what you actually want is to stop paying for subscriptions you forgot about and keep a
        simple monthly cap, that broader machinery is a lot of surface area (and cost) for the job.
      </p>

      <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
        Competitor pricing verified from Monarch&rsquo;s public pricing page in July 2026. Prices can change — check their
        site for the current figure.
      </p>

      <ComparePageCta title="Track subscriptions and a budget without a live bank connection" />
    </ContentShell>
  );
}
