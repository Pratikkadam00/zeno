import { listPartnerIntegrations } from "@subradar/shared";

export default function PartnersPage() {
  const integrations = listPartnerIntegrations();

  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Partner Integrations</h1>
      <p>
        Partner manifests define scope, review status, and whether user-approved financial export is required.
      </p>
      <ol className="steps">
        {integrations.map((integration) => (
          <li key={integration.id}>
            {integration.name}: {integration.status.replace("_", " ")}
          </li>
        ))}
      </ol>
    </main>
  );
}
