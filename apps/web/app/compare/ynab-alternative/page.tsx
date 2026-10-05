import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = pageMetadata({
  title: "YNAB alternative with a one-time purchase",
  description:
    "YNAB costs $109 a year, every year, with no one-time option. Zeno's Lifetime plan is a single $79.99 payment: pay once, keep it, and nothing renews.",
  path: "/compare/ynab-alternative"
});

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
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "YNAB alternative", item: siteUrl("/compare/ynab-alternative") }
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

      <p style={{ fontSize: "0.85rem", color: "var(--ink-2)" }}>
        Competitor pricing verified from YNAB&rsquo;s public pricing page in July 2026. Prices can change — check their
        site for the current figure.
      </p>

      <ComparePageCta title="Pay once for subscription tracking and budgeting — not every year" />
    </ContentShell>
  );
}
