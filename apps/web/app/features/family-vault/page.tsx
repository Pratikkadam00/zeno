import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { createFamilyVaultSummary, demoFamilyMembers } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

// Every figure here is the server's own rule (apps/api/src/family.ts): five
// members to a household, an eight-character share code, each member sends
// only their monthly total. The example household is marked as one.
export const metadata: Metadata = pageMetadata({
  title: "Family Vault: five people, no shared lists",
  description:
    "Family Vault shows a household's subscription totals per member, up to five people, joined by an eight-character code. Each list stays on its own phone.",
  path: "/features/family-vault"
});

export default function FamilyVaultFeaturePage() {
  const summary = createFamilyVaultSummary(demoFamilyMembers, []);

  return (
    <ContentShell
      eyebrow="Family Vault · in the app, with the Family plan"
      title="One household ledger, without sharing your list"
      lead="A household pays for streaming, storage, music and a dozen other things across several phones and cards, and nobody sees the total. Family Vault puts the totals side by side, per person, so a duplicate plan or a forgotten trial shows up. Each person's own list stays on their own phone."
    >
      <h2>How a household works</h2>
      <ol className={styles.steps}>
        <li>One person creates the household in the app and gets an eight-character share code.</li>
        <li>Up to four more people enter the code on their own phones. A household holds five people at most.</li>
        <li>Each phone sends one number: that member&rsquo;s monthly total. The vault shows the totals per member and the household&rsquo;s sum.</li>
        <li>Anyone can leave at any time. When the last member leaves, the household is deleted.</li>
      </ol>

      <h2>What is shared, and what is not</h2>
      <p>
        Shared: each member&rsquo;s name as they entered it, and their monthly total. Not shared: the subscriptions behind that total, their
        names, amounts, notes or renewal dates. Those stay encrypted on each member&rsquo;s phone, as they do for a person using Zeno alone.
        A teenager&rsquo;s list is theirs; the household sees only that it costs, say, $14 a month.
      </p>

      <h2>An example household</h2>
      <p>The names below are an example, not real people.</p>
      <ul className={styles.list}>
        {summary.members.map((member) => (
          <li key={member.id}>
            <span>{member.name}</span>
            <span className={styles.tag}>{member.role}</span>
          </li>
        ))}
      </ul>

      <h2>What it costs</h2>
      <p>
        Family Vault is part of the Family plan, which includes everything in Pro for every member: see the{" "}
        <Link href="/#pricing">pricing section</Link>. Reminders, cancellation guides and verification work for each member exactly as they do
        on the free plan.
      </p>

      <div className={styles.backRow}>
        <Link href="/features">← All features</Link>
      </div>
    </ContentShell>
  );
}
