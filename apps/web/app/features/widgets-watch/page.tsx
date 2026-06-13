import type { Metadata } from "next";
import { createWidgetSnapshot } from "@subradar/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Widgets + Watch — Renewals at a glance | Zeno",
  description: "Zeno's home screen widgets and Apple Watch complications show your next renewal and monthly spend from a compact local snapshot — no raw financial records on the server.",
  openGraph: {
    title: "Widgets + Watch — Renewals at a glance | Zeno",
    description: "Home screen widgets and Apple Watch complications show your next renewal and monthly spend from a compact local snapshot.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function WidgetsWatchFeaturePage() {
  const snapshot = createWidgetSnapshot([]);

  return (
    <ContentShell
      eyebrow="Widgets + Watch"
      title="Renewals at a glance"
      lead="Zeno widgets use a compact local snapshot for next renewal, monthly spend, and Apple Watch complication text."
    >
      <ul className={styles.list}>
        <li>
          <span>Snapshot generated locally</span>
          <span className={styles.tag}>{snapshot.generatedAt}</span>
        </li>
        <li>
          <span>Complication fallback</span>
          <span className={styles.tag}>{snapshot.watchComplicationText}</span>
        </li>
      </ul>
      <p>The server does not need raw financial records to render widget data.</p>

      <div className={styles.backRow}>
        <a href="/">← Back to Zeno</a>
      </div>
    </ContentShell>
  );
}
