import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { summarizeSpendTwin } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Spend Twin: what your subscriptions really cost",
  description:
    "Spend Twin turns abstract subscription totals into real-world tradeoffs you understand at a glance, computed locally from Zeno's encrypted subscription ledger.",
  path: "/features/spend-twin"
});

export default function SpendTwinFeaturePage() {
  return (
    <ContentShell
      eyebrow="Spend Twin"
      title="What your subscriptions really cost"
      lead={`For example: ${summarizeSpendTwin(28400)} It turns abstract subscription totals into tradeoffs people understand quickly.`}
    >
      <p>
        In the mobile app this stays local-first and uses the encrypted subscription ledger as its
        source: your numbers are computed on the phone, never sent to a server.
      </p>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
