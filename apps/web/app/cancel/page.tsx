import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { services } from "@zeno/service-catalog";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { CancelHubBrowser } from "./CancelHubBrowser";

const SERVICE_COUNT = services.length;

export const metadata: Metadata = pageMetadata({
  title: `How to cancel any subscription: ${SERVICE_COUNT}+ guides`,
  description:
    `Step-by-step cancellation guides for ${SERVICE_COUNT}+ services, sorted by category. Find yours, follow the steps, and cancel before the next charge lands.`,
  path: "/cancel"
});

export default function CancelHubPage() {
  const hubServices = services.map((service) => ({
    name: service.name,
    slug: service.slug,
    category: service.category
  }));

  return (
    <ContentShell
      eyebrow="Cancellation guides"
      title={`How to cancel ${SERVICE_COUNT}+ subscriptions`}
      lead="Search or browse by category to find step-by-step instructions for the service you want to cancel, with a direct link to its cancellation page when one exists."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Cancellation guides", item: siteUrl("/cancel") }
          ]
        }}
      />
      <CancelHubBrowser services={hubServices} />
    </ContentShell>
  );
}
