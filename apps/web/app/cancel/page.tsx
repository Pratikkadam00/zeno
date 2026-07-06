import type { Metadata } from "next";
import { services } from "@zeno/service-catalog";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import { CancelHubBrowser } from "./CancelHubBrowser";

const SERVICE_COUNT = services.length;

export const metadata: Metadata = {
  title: `How to cancel any subscription — ${SERVICE_COUNT}+ guides | Zeno`,
  description: `Step-by-step cancellation guides for ${SERVICE_COUNT}+ services, organized by category. Search or browse to find your subscription and cancel it in a few clicks.`,
  alternates: { canonical: "/cancel" },
  openGraph: {
    title: `How to cancel any subscription — ${SERVICE_COUNT}+ guides | Zeno`,
    description: `Step-by-step cancellation guides for ${SERVICE_COUNT}+ services, organized by category.`,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

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
      lead="Search or browse by category to find step-by-step instructions for the service you want to cancel — including a direct link to their cancellation page when one exists."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "Cancellation guides", item: "https://zeno.app/cancel" }
          ]
        }}
      />
      <CancelHubBrowser services={hubServices} />
    </ContentShell>
  );
}
