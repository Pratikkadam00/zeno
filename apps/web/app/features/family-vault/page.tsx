import type { Metadata } from "next";
import { createFamilyVaultSummary, demoFamilyMembers } from "@subradar/shared";

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
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Family Vault</h1>
      <p>
        Family Vault is the shared view for household subscriptions, ownership, and renewal accountability.
      </p>
      <ol className="steps">
        {summary.members.map((member) => (
          <li key={member.id}>{member.name}: {member.role}</li>
        ))}
      </ol>
    </main>
  );
}
