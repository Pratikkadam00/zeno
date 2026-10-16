import { siteUrl } from "@/lib/site";
import { findServiceBySlug, isGeneralCancelGuide, services } from "@zeno/service-catalog";
import { INDEX_GENERAL_GUIDES, guideDescription, isGuessedCancelUrl } from "@/lib/guides";
import { guideFaqs, guideSections } from "@/lib/guide-content";
import { WEBSITE_ID } from "@/lib/seo";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import hubStyles from "../cancel-hub.module.css";

// Only the catalogue's guides exist. Without this, any made-up /cancel/<slug> was
// rendered on request and written to the server's disk cache (about nine files
// each, without limit: F183); now it gets the prebuilt 404 page.
export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) {
    return {
      title: { absolute: "Cancellation guide not found | Zeno" },
      description: "We could not find a cancellation guide for this service. Browse Zeno's guides to cancel your subscriptions in a few steps."
    };
  }

  // A general guide says so in search results too (F171: 470 of 509 carry the
  // same five steps); the unique thing it offers is the service's own cancel link.
  const general = isGeneralCancelGuide(service.name, service.cancellationGuideSteps);
  return pageMetadata({
    title: `How to cancel ${service.name}`,
    description: guideDescription(service.name, service.cancellationDifficulty.replace("_", " "), general),
    path: `/cancel/${slug}`,
    type: "article",
    // D16: general guides stay on the site either way; this decides whether
    // search engines are asked to index them (apps/web/lib/guides.ts).
    ...(general && !INDEX_GENERAL_GUIDES ? { robots: { index: false, follow: true } } : {})
  });
}

// Each difficulty's badge class. CSS-module classes always exist, so there is no
// fallback: the `?? ""` each one carried could never run (an uncoverable branch).
const DIFFICULTY_BADGE: Record<string, string | undefined> = {
  easy: styles.badgeEasy,
  medium: styles.badgeMedium,
  hard: styles.badgeHard,
  dark_pattern: styles.badgeHard
};

export default async function CancellationGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = findServiceBySlug(slug);
  if (!service) {
    notFound();
  }

  const difficulty = service.cancellationDifficulty;
  const difficultyLabel = difficulty.replace("_", " ");
  const general = isGeneralCancelGuide(service.name, service.cancellationGuideSteps);
  const badgeClass = DIFFICULTY_BADGE[difficulty];

  // Related guides: other services in the same catalog category (the raw,
  // richer ServiceCategory — streaming/gaming/music/etc — not the coarser
  // SubscriptionCategory findServiceBySlug maps onto), so "related" actually
  // means similar, not just broadly "entertainment".
  const rawService = services.find((candidate) => candidate.slug === slug);
  const relatedServices = rawService
    ? services.filter((candidate) => candidate.category === rawService.category && candidate.slug !== slug).slice(0, 6)
    : [];

  // W5 (2026-10-16): the half of the guide that is true for every service: the
  // store paths, access after cancelling, confirmation, refunds, the usual
  // price. The questions are rendered and put in FAQPage schema from one
  // array, so the schema mirrors the page word for word (SEO.md §4.3).
  const sections = guideSections(service.name, service.defaultMonthlyPrice, service.defaultAnnualPrice);
  const faqs = guideFaqs(service.name);
  const pageUrl = siteUrl(`/cancel/${slug}`);

  return (
    <ContentShell
      eyebrow="Cancellation guide"
      title={`How to cancel ${service.name}`}
      lead={
        general
          ? // Every catalog entry has a cancellation link (services.test.ts checks each one is https).
            `We haven't written ${service.name}-specific steps yet: these are the steps most services use, and the link below opens ${service.name}'s own cancellation page. Zeno tracks the renewal date so you can cancel before the next charge lands.`
          : `Follow these steps to stop your ${service.name} subscription. Zeno tracks the renewal date so you can cancel before the next charge lands.`
      }
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
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Cancellation guides", item: siteUrl("/cancel") },
            { "@type": "ListItem", position: 3, name: service.name, item: siteUrl(`/cancel/${slug}`) }
          ]
        }}
      />
      <span className={[styles.badge, badgeClass].filter(Boolean).join(" ")}>Difficulty: {difficultyLabel}</span>

      {general ? (
        <p>
          <strong>General steps.</strong> We haven&apos;t verified {service.name}&apos;s exact cancellation flow yet. If a step doesn&apos;t
          match what you see, look for Billing or Subscription in your account settings.
        </p>
      ) : null}

      <ol className={styles.steps}>
        {service.cancellationGuideSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      {isGuessedCancelUrl(service.website, service.cancellationUrl) ? (
        // F242: this catalogue link is "<website>/account", a guess that 404s
        // for about a third of a sample. The homepage is the one address we
        // know is right, so that is what this guide opens.
        <p>
          <a className={styles.cta} href={service.website} target="_blank" rel="noopener noreferrer">
            Open {service.name}&apos;s website →
          </a>
        </p>
      ) : (
        // Every catalogue entry has a cancellation link (services.test.ts
        // checks each one is https), so there is no third case.
        <p>
          <a className={styles.cta} href={service.cancellationUrl} target="_blank" rel="noopener noreferrer">
            Open {service.name} cancellation page →
          </a>
        </p>
      )}

      {sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.subsections?.map((sub) => (
            <div key={sub.heading}>
              <h3>{sub.heading}</h3>
              <ol className={styles.steps}>
                {sub.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {sub.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ))}
        </section>
      ))}

      <h2>Questions about cancelling {service.name}</h2>
      {faqs.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${pageUrl}#faq`,
          url: pageUrl,
          isPartOf: { "@id": WEBSITE_ID },
          mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a } }))
        }}
      />

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
