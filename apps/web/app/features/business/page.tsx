import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { createBusinessSummary, demoBusinessWorkspace } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Business tier: team subscription tracking",
  description:
    "Track company subscriptions, finance seats, renewal load, and team spending with Zeno's Business Tier — without turning your tracker into a bank-data warehouse.",
  path: "/features/business"
});

export default function BusinessFeaturePage() {
  const summary = createBusinessSummary(demoBusinessWorkspace, []);

  return (
    <ContentShell
      eyebrow="Business Tier · Planned · not available today"
      title="Subscription tracking for teams"
      lead="A plan we are considering, not one you can use today: company subscriptions, finance seats, renewal load, and team spending, without turning Zeno into a bank-data warehouse. The figures below are an example workspace."
    >
      <ul className={styles.list}>
        <li>
          <span>Example workspace</span>
          <span className={styles.tag}>{summary.workspaceName}</span>
        </li>
        <li>
          <span>Configured seats</span>
          <span className={styles.tag}>{summary.seatCount}</span>
        </li>
        <li>
          <span>Renewals in the next 30 days</span>
          <span className={styles.tag}>{summary.renewalCountNext30Days}</span>
        </li>
      </ul>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
