import type { Metadata } from "next";
import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Optional Open Banking — Read-only bank connections | Zeno",
  description: "Zeno's optional open banking uses Plaid and MX as read-only OAuth adapters: it sees transactions, never login credentials, and the core app works without connecting a bank.",
  alternates: { canonical: "/features/open-banking" },
  openGraph: {
    title: "Optional Open Banking — Read-only bank connections | Zeno",
    description: "Read-only Plaid and MX adapters: Zeno sees transactions, never login credentials, and works without a bank connection.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function OpenBankingFeaturePage() {
  return (
    <ContentShell
      eyebrow="Optional Open Banking"
      title="Read-only bank connections"
      lead="Plaid and MX are modeled as read-only OAuth adapters. Zeno sees transactions, not login credentials, and the core app works without this premium connection."
    >
      <ol className={styles.steps}>
        <li>You start a provider-hosted connection.</li>
        <li>The provider returns a read-only token reference.</li>
        <li>Recurring charges are normalized locally before confirmation.</li>
      </ol>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
