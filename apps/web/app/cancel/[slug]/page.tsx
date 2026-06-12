import { findServiceBySlug, services } from "@subradar/service-catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) {
    return {
      title: "Cancellation guide not found — Zeno",
      description: "We could not find a cancellation guide for this service. Browse Zeno's guides to cancel your subscriptions in a few steps."
    };
  }

  const title = `How to cancel ${service.name} — Zeno`;
  const description = `Step-by-step guide to cancel your ${service.name} subscription (difficulty: ${service.cancellationDifficulty.replace("_", " ")}), with a direct link to the cancellation page when available.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
    }
  };
}

export default async function CancellationGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) {
    notFound();
  }

  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>How to cancel {service.name}</h1>
      <p>
        Difficulty: <strong>{service.cancellationDifficulty.replace("_", " ")}</strong>
      </p>
      <ol className="steps">
        {service.cancellationGuideSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {service.cancellationUrl ? (
        <a className="primary" href={service.cancellationUrl}>Open cancellation page</a>
      ) : null}
    </main>
  );
}
