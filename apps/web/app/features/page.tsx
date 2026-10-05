import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { CardList } from "@/components/site/CardList";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";

// The hub for the feature pages: before it, /features was a 404 (measured on
// the live site, 2026-10-04). Planned features are labelled as on their own
// pages (F172), never shown as available.
export const metadata: Metadata = pageMetadata({
  title: "Features: what Zeno does, and what's planned",
  description:
    "Find subscriptions from receipts and statements you control, get warned before renewals, cancel with verified guides. Plus what is planned and not here yet.",
  path: "/features"
});

export const FEATURES = [
  { href: "/features/spend-twin", name: "Spend Twin", note: "What your subscriptions really cost, as tradeoffs you understand at a glance.", planned: false },
  { href: "/features/family-vault", name: "Family Vault", note: "Shared household subscriptions, with an account.", planned: false },
  { href: "/features/widgets-watch", name: "Widgets + Watch", note: "Renewals at a glance.", planned: true },
  { href: "/features/open-banking", name: "Open Banking", note: "Read-only bank connections.", planned: true },
  { href: "/features/business", name: "Business Tier", note: "Team subscription tracking.", planned: true }
] as const;

export default function FeaturesPage() {
  return (
    <ContentShell
      eyebrow="Features"
      title="What Zeno does"
      lead="Discovery from email receipts and statements you control, a warning before every renewal, and cancellations that count as done only when no new charge appears. No bank login required. The pages below go deeper; planned features say so."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Features", item: siteUrl("/features") }
          ]
        }}
      />
      <CardList
        cards={FEATURES.map((f) => ({
          href: f.href,
          title: f.name,
          description: f.note,
          meta: f.planned ? "Planned · not available today" : "In the app",
          cta: "Learn more"
        }))}
      />
      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
