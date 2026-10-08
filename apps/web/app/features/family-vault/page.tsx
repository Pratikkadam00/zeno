import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { createFamilyVaultSummary, demoFamilyMembers } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Family Vault: shared household subscriptions",
  description:
    "Family Vault is Zeno's shared view for household subscriptions: member roles, ownership, and renewal accountability for streaming, tools, and family app costs.",
  path: "/features/family-vault"
});

export default function FamilyVaultFeaturePage() {
  const summary = createFamilyVaultSummary(demoFamilyMembers, []);

  return (
    <ContentShell
      eyebrow="Family Vault"
      title="Shared household subscriptions"
      lead="Family Vault is the shared view for household subscriptions, ownership, and renewal accountability, so no one pays twice for the same streaming plan. The members below are an example household."
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
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
