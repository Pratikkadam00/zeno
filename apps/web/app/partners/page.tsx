import type { Metadata } from "next";
import { listPartnerIntegrations } from "@subradar/shared";

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
