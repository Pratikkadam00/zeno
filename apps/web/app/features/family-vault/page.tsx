import { createFamilyVaultSummary, demoFamilyMembers } from "@subradar/shared";

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
