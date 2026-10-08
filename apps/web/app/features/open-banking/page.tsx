import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Open banking (planned): read-only bank links",
  description:
    "Optional read-only bank connections are planned for Zeno and not available today. Zeno works fully without a bank, from email receipts and statement imports.",
  path: "/features/open-banking"
});

export default function OpenBankingFeaturePage() {
  return (
    <ContentShell
      eyebrow="Planned · not available today"
      title="Read-only bank connections (planned)"
      lead="This is a feature we're considering, not one you can use today. If Zeno adds optional bank connections, they would be read-only OAuth adapters (Plaid or MX) that see transactions, never your login credentials. The app would keep working fully without them. Everything Zeno does today runs on email receipts and statement imports you control, with no bank connection required."
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
