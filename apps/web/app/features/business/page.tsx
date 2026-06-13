import type { Metadata } from "next";
import { createBusinessSummary, demoBusinessWorkspace } from "@subradar/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Business Tier — Team subscription tracking | Zeno",
  description: "Track company subscriptions, finance seats, renewal load, and team spending with Zeno's Business Tier — without turning your tracker into a bank-data warehouse.",
  openGraph: {
    title: "Business Tier — Team subscription tracking | Zeno",
    description: "Track company subscriptions, finance seats, renewal load, and team spending with Zeno's Business Tier.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function BusinessFeaturePage() {
  const summary = createBusinessSummary(demoBusinessWorkspace, []);

  return (
    <ContentShell
      eyebrow="Business Tier"
      title="Subscription tracking for teams"
      lead="Track company subscriptions, finance seats, renewal load, and team spending without turning Zeno into a bank-data warehouse."
    >
      <ul className={styles.list}>
        <li>
          <span>Workspace</span>
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
        <a href="/">← Back to Zeno</a>
      </div>
    </ContentShell>
  );
}
