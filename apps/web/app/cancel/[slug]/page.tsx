import { findServiceBySlug, services } from "@zeno/service-catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import hubStyles from "../cancel-hub.module.css";

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

  const path = `/cancel/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "article",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
    },
    twitter: { card: "summary_large_image", title, description }
  };
}

const DIFFICULTY_BADGE: Record<string, string> = {
  easy: styles.badgeEasy ?? "",
  medium: styles.badgeMedium ?? "",
  hard: styles.badgeHard ?? "",
  dark_pattern: styles.badgeHard ?? ""
};

export default async function CancellationGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) {
    notFound();
  }

  const difficulty = service.cancellationDifficulty;
  const difficultyLabel = difficulty.replace("_", " ");
  const badgeClass = DIFFICULTY_BADGE[difficulty] ?? styles.badgeMedium ?? "";

  // Related guides: other services in the same catalog category (the raw,
  // richer ServiceCategory — streaming/gaming/music/etc — not the coarser
  // SubscriptionCategory findServiceBySlug maps onto), so "related" actually
  // means similar, not just broadly "entertainment".
  const rawService = services.find((candidate) => candidate.slug === slug);
  const relatedServices = rawService
    ? services.filter((candidate) => candidate.category === rawService.category && candidate.slug !== slug).slice(0, 6)
    : [];

  return (
    <ContentShell
      eyebrow="Cancellation guide"
      title={`How to cancel ${service.name}`}
      lead={`Follow these steps to stop your ${service.name} subscription. Zeno tracks the renewal date so you can cancel before the next charge lands.`}
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: `How to cancel ${service.name}`,
          description: `Step-by-step guide to cancel your ${service.name} subscription.`,
          step: service.cancellationGuideSteps.map((step, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text: step
          }))
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://zeno.app/" },
            { "@type": "ListItem", position: 2, name: "Cancellation guides", item: "https://zeno.app/cancel" },
            { "@type": "ListItem", position: 3, name: service.name, item: `https://zeno.app/cancel/${slug}` }
          ]
        }}
      />
      <span className={`${styles.badge} ${badgeClass}`}>Difficulty: {difficultyLabel}</span>

      <ol className={styles.steps}>
        {service.cancellationGuideSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {service.cancellationUrl ? (
        <p>
          <a className={styles.cta} href={service.cancellationUrl} target="_blank" rel="noopener noreferrer">
            Open {service.name} cancellation page →
          </a>
        </p>
      ) : null}

      {relatedServices.length > 0 ? (
        <>
          <h2>Related cancellation guides</h2>
          <ul className={hubStyles.relatedGrid}>
            {relatedServices.map((related) => (
              <li key={related.slug}>
                <Link href={`/cancel/${related.slug}`}>{related.name}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className={styles.backRow}>
        <Link href="/cancel">← All cancellation guides</Link>
      </div>
    </ContentShell>
  );
}
