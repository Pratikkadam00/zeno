import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = pageMetadata({
  title: "A subscription tracker without bank login",
  description:
    "Zeno finds and tracks your subscriptions without asking for your bank login: from email receipts and statements you control, encrypted on your device.",
  path: "/compare/no-bank-login"
});

export default function NoBankLoginComparePage() {
  return (
    <ContentShell
      eyebrow="Subscription tracker without bank login"
      title="A subscription tracker that never asks for your bank login"
      lead="Most subscription trackers ask you to link your bank account through a service like Plaid before they find a single subscription. Zeno does not. It works from email receipts and the bank or card statements you choose to import, read on your phone."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "A subscription tracker without bank login", item: siteUrl("/compare/no-bank-login") }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Most subscription trackers"
        rows={[
          { feature: "Bank login required to start", zeno: "No. Email or statement import, or manual entry", competitor: "Usually yes, via Plaid or a similar aggregator" },
          { feature: "Sees your bank credentials", zeno: "Never", competitor: "Passed to a third-party aggregator" },
          { feature: "Works if you never connect a bank", zeno: "Yes, the full app", competitor: "Often limited or blocked" },
          { feature: "Where your data lives", zeno: "Encrypted on your device", competitor: "Typically synced to their servers" }
        ]}
      />

      <p>
        Zeno&rsquo;s architecture is local-first: your subscription list lives in an encrypted database on your own device.
        Discovery comes from scanning email receipts (read-only, on-device) or importing a CSV bank/card statement you download
        yourself, never from a bank login. See the full picture in our <a href="/legal/privacy">privacy policy</a>.
      </p>

      <ComparePageCta title="Track your subscriptions without handing over your bank login" />
    </ContentShell>
  );
}
