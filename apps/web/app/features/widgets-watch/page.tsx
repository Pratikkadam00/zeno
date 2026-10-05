import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { createWidgetSnapshot } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Widgets and Watch: renewals at a glance",
  description:
    "Home screen widgets and Apple Watch complications show your next renewal and monthly spend from a small local snapshot, with no raw financial data on a server.",
  path: "/features/widgets-watch"
});

export default function WidgetsWatchFeaturePage() {
  const snapshot = createWidgetSnapshot([]);
  const generatedAt = new Date(snapshot.generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  });

  return (
    <ContentShell
      eyebrow="Widgets + Watch · Planned · not available today"
      title="Renewals at a glance"
      lead="Home-screen widgets and an Apple Watch complication are planned, not available today. They would read a compact snapshot made on the phone: the next renewal, monthly spend, and a short complication line."
    >
      <ul className={styles.list}>
        <li>
          <span>Example snapshot, generated</span>
          <span className={styles.tag}>{generatedAt} UTC</span>
        </li>
        <li>
          <span>Complication fallback</span>
          <span className={styles.tag}>{snapshot.watchComplicationText}</span>
        </li>
      </ul>
      <p>The snapshot would be made on the phone, so the server would not need your subscription records to draw a widget.</p>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
