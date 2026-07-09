import type { Metadata } from "next";
import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Open Banking (planned) — Read-only bank connections | Zeno",
  description: "Optional read-only bank connections are a planned Zeno feature, not available today. Zeno works fully without connecting a bank, using email receipts and statement imports.",
  alternates: { canonical: "/features/open-banking" },
  openGraph: {
    title: "Open Banking (planned) — Read-only bank connections | Zeno",
    description: "A planned, optional feature — not available today. Zeno works fully without a bank connection.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function OpenBankingFeaturePage() {
  return (
    <ContentShell
      eyebrow="Planned · not available today"
      title="Read-only bank connections (planned)"
      lead="This is a feature we're considering, not one you can use today. If Zeno adds optional bank connections, they would be read-only OAuth adapters (Plaid or MX) that see transactions, never your login credentials — and the app would keep working fully without them. Everything Zeno does today runs on email receipts and statement imports you control, with no bank connection required."
    >
      <p className={styles.lead}>How it would work, if we ship it:</p>
      <ol className={styles.steps}>
        <li>You would start a provider-hosted connection.</li>
        <li>The provider would return a read-only token reference.</li>
        <li>Recurring charges would be normalized locally before confirmation.</li>
      </ol>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
