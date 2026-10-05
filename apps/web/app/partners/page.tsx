import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { listPartnerIntegrations } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Partner integrations (planned)",
  description:
    "Zeno's planned partner integrations, none available today. Each manifest states its scope and whether a financial export you approve would be required.",
  path: "/partners"
});

export default function PartnersPage() {
  const integrations = listPartnerIntegrations();

  return (
    <ContentShell
      eyebrow="Integrations · Planned · not available today"
      title="Partner Integrations"
      lead="Integrations we are planning or building, none available today and none a partnership: each name is a service Zeno may connect to. A manifest defines its scope and whether a user-approved financial export is required."
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
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
