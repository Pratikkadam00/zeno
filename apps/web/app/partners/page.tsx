import type { Metadata } from "next";
import { listPartnerIntegrations } from "@subradar/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Partner Integrations | Zeno",
  description: "Browse Zeno's partner integrations and their review status. Partner manifests define scope and whether user-approved financial export is required.",
  openGraph: {
    title: "Partner Integrations | Zeno",
    description: "Browse Zeno's partner integrations, their review status, scopes, and financial export requirements.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function PartnersPage() {
  const integrations = listPartnerIntegrations();

  return (
    <ContentShell
      eyebrow="Integrations"
      title="Partner Integrations"
      lead="Partner manifests define scope, review status, and whether user-approved financial export is required."
    >
      <ul className={styles.list}>
        {integrations.map((integration) => (
          <li key={integration.id}>
            <span>{integration.name}</span>
            <span className={styles.tag}>{integration.status.replace("_", " ")}</span>
          </li>
        ))}
      </ul>

      <div className={styles.backRow}>
        <a href="/">← Back to Zeno</a>
      </div>
    </ContentShell>
  );
}
