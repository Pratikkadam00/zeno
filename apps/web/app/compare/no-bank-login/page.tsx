import type { Metadata } from "next";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { ComparePageCta } from "@/components/site/ComparePageCta";

export const metadata: Metadata = {
  title: "A subscription tracker without bank login | Zeno",
  description: "Zeno finds and tracks your subscriptions without ever asking for your bank login — from email receipts and statements you control, encrypted on your device.",
  alternates: { canonical: "/compare/no-bank-login" },
  openGraph: {
    title: "A subscription tracker without bank login | Zeno",
    description: "Zeno finds and tracks your subscriptions without ever asking for your bank login.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function NoBankLoginComparePage() {
  return (
    <ContentShell
      eyebrow="Subscription tracker without bank login"
      title="A subscription tracker that never asks for your bank login"
      lead="Most subscription trackers ask you to link your bank account through a service like Plaid before they'll find a single subscription. Zeno doesn't — it works from email receipts and bank/card statements you choose to import, processed on your device."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "A subscription tracker without bank login", item: "https://zeno.app/compare/no-bank-login" }
          ]
        }}
      />

      <ComparisonTable
        competitorName="Most subscription trackers"
        rows={[
          { feature: "Bank login required to start", zeno: "No — email/statement import or manual entry", competitor: "Usually yes, via Plaid or a similar aggregator" },
          { feature: "Sees your bank credentials", zeno: "Never", competitor: "Passed to a third-party aggregator" },
          { feature: "Works if you never connect a bank", zeno: "Yes — full app, forever", competitor: "Often limited or blocked" },
          { feature: "Where your data lives", zeno: "Encrypted on your device", competitor: "Typically synced to their servers" }
        ]}
      />

      <p>
        Zeno&rsquo;s architecture is local-first: your subscription list lives in an encrypted database on your own device.
        Discovery comes from scanning email receipts (read-only, on-device) or importing a CSV bank/card statement you download
        yourself — never from handing over a bank login. See the full picture in our <a href="/legal/privacy">privacy policy</a>.
      </p>

      <ComparePageCta title="Track your subscriptions without handing over your bank login" />
    </ContentShell>
  );
}
