import { findServiceBySlug, services } from "@subradar/service-catalog";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
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
