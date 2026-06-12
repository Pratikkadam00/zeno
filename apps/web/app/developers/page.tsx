import type { Metadata } from "next";
import { createPublicApiKeyPreview, type PublicApiKey } from "@subradar/shared";

export const metadata: Metadata = {
  title: "Public API for developers | Zeno",
  description: "Build on Zeno's public API: scoped keys with masked previews, explicit read/write scopes, and a consistent { data, error, meta } response envelope. Financial sync stays encrypted.",
  openGraph: {
    title: "Public API for developers | Zeno",
    description: "Scoped API keys, masked previews, explicit read/write scopes, and a consistent response envelope.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

const key: PublicApiKey = {
  id: "key_docs",
  label: "Docs preview",
  prefix: "sr_dev",
  scopes: ["subscriptions:read", "services:read", "analytics:read"],
  createdAt: "2026-05-24T00:00:00.000Z"
};

export default function DevelopersPage() {
  const preview = createPublicApiKeyPreview(key);

  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Public API</h1>
      <p>
        The power-user API uses scoped keys, masked previews, and explicit read/write scopes. Financial sync remains encrypted by default.
      </p>
      <ol className="steps">
        <li>Example key: {preview.maskedKey}</li>
        <li>Scopes: {preview.scopes.join(", ")}</li>
        <li>Envelope: {"{ data, error, meta }"}</li>
      </ol>
    </main>
  );
}
