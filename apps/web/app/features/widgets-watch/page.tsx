import type { Metadata } from "next";
import Link from "next/link";
import { createWidgetSnapshot } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Widgets + Watch — Renewals at a glance | Zeno",
  description: "Zeno's home screen widgets and Apple Watch complications show your next renewal and monthly spend from a compact local snapshot — no raw financial records on the server.",
  alternates: { canonical: "/features/widgets-watch" },
  openGraph: {
    title: "Widgets + Watch — Renewals at a glance | Zeno",
    description: "Home screen widgets and Apple Watch complications show your next renewal and monthly spend from a compact local snapshot.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

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
