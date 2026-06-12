import { createPublicApiKeyPreview, type PublicApiKey } from "@subradar/shared";

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
