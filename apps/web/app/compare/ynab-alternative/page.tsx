import type { Metadata } from "next";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = {
  title: "YNAB alternative — one-time purchase | Zeno",
  description: "YNAB is $109/year, forever, with no one-time option. Zeno's lifetime plan is a single $79.99 payment — pay once, own it, no renewal.",
  alternates: { canonical: "/compare/ynab-alternative" },
  openGraph: {
    title: "YNAB alternative — one-time purchase | Zeno",
    description: "YNAB is $109/year forever. Zeno's lifetime plan is a single $79.99 payment.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function YnabComparePage() {
  return (
    <ContentShell
      eyebrow="YNAB alternative"
      title="A YNAB alternative you pay for once"
      lead="YNAB is $109 a year (or $14.99/month) — every year, for as long as you use it. There's no one-time purchase option, so a five-year YNAB user has paid roughly $545. Zeno's lifetime plan is a single $79.99 payment: pay once, keep using it, no renewal."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "YNAB alternative", item: "https://zeno.app/compare/ynab-alternative" }
          ]
        }}
      />

      <ComparisonTable
        competitorName="YNAB"
        rows={[
          { feature: "Annual subscription", zeno: "$29.99/yr", competitor: "$109/yr (YNAB's own pricing page)" },
          { feature: "Monthly subscription", zeno: "$3.99/mo", competitor: "$14.99/mo" },
          { feature: "One-time / lifetime option", zeno: "Yes — $79.99, once, ever", competitor: "None — subscription-only" },
          { feature: "Bank connection required", zeno: "No", competitor: "Optional, but central to YNAB's live-sync workflow" }
        ]}
      />

      <p>
        This isn&rsquo;t a knock on YNAB&rsquo;s budgeting method, which plenty of people genuinely like. It&rsquo;s about the
        pricing model: a subscription that never ends versus a purchase that does. If you want the ongoing cost to actually stop,
        that&rsquo;s a one-time payment, not a cheaper recurring one.
      </p>

      <ComparePageCta title="Pay once for subscription tracking and budgeting — not every year" />
    </ContentShell>
  );
}
