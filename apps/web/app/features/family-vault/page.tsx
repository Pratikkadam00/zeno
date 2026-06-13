import type { Metadata } from "next";
import { createFamilyVaultSummary, demoFamilyMembers } from "@subradar/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Family Vault — Shared household subscriptions | Zeno",
  description: "Family Vault is Zeno's shared view for household subscriptions: member roles, ownership, and renewal accountability for streaming, tools, and family app costs.",
  openGraph: {
    title: "Family Vault — Shared household subscriptions | Zeno",
    description: "Zeno's shared view for household subscriptions: member roles, ownership, and renewal accountability.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function FamilyVaultFeaturePage() {
  const summary = createFamilyVaultSummary(demoFamilyMembers, []);

  return (
    <ContentShell
      eyebrow="Family Vault"
      title="Shared household subscriptions"
      lead="Family Vault is the shared view for household subscriptions, ownership, and renewal accountability — so no one pays twice for the same streaming plan."
    >
      <ul className={styles.list}>
        {summary.members.map((member) => (
          <li key={member.id}>
            <span>{member.name}</span>
            <span className={styles.tag}>{member.role}</span>
          </li>
        ))}
      </ul>

      <div className={styles.backRow}>
        <a href="/">← Back to Zeno</a>
      </div>
    </ContentShell>
  );
}
