import type { Metadata } from "next";
import Link from "next/link";
import { summarizeSpendTwin } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Spend Twin — What your subscriptions really cost | Zeno",
  description: "Spend Twin turns abstract subscription totals into real-world tradeoffs you understand at a glance, computed locally from Zeno's encrypted subscription ledger.",
  alternates: { canonical: "/features/spend-twin" },
  openGraph: {
    title: "Spend Twin — What your subscriptions really cost | Zeno",
    description: "Turns abstract subscription totals into real-world tradeoffs, computed locally from your encrypted subscription ledger.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function SpendTwinFeaturePage() {
  return (
    <ContentShell
      eyebrow="Spend Twin"
      title="What your subscriptions really cost"
      lead={`${summarizeSpendTwin(28400)} It turns abstract subscription totals into tradeoffs people understand quickly.`}
    >
      <p>
        In the mobile app this stays local-first and uses the encrypted subscription ledger as its
        source — your numbers are computed on-device, never shipped to a server.
      </p>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
