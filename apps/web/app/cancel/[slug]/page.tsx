import { findServiceBySlug, services } from "@subradar/service-catalog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

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

  return (
    <ContentShell
      eyebrow="Cancellation guide"
      title={`How to cancel ${service.name}`}
      lead={`Follow these steps to stop your ${service.name} subscription. Zeno tracks the renewal date so you can cancel before the next charge lands.`}
    >
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

      <div className={styles.backRow}>
        <a href="/">← Back to Zeno</a>
      </div>
    </ContentShell>
  );
}
