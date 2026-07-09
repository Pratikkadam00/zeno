import type { Metadata } from "next";
import Link from "next/link";
import { createPublicApiKeyPreview, type PublicApiKey } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = {
  title: "Public API for developers | Zeno",
  description: "Build on Zeno's public API: scoped keys with masked previews, explicit read/write scopes, and a consistent { data, error, meta } response envelope. Your raw financial data stays on your device.",
  alternates: { canonical: "/developers" },
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
    <ContentShell
      eyebrow="Developers"
      title="Public API"
      lead="The power-user API uses scoped keys, masked previews, and explicit read/write scopes. Your raw financial data stays on your device — it isn't exposed through this API."
    >
      <ul className={styles.list}>
        <li>
          <span>Example key</span>
          <span className={styles.code}>{preview.maskedKey}</span>
        </li>
        <li>
          <span>Scopes</span>
          <span className={styles.tag}>{preview.scopes.join(", ")}</span>
        </li>
        <li>
          <span>Response envelope</span>
          <span className={styles.code}>{"{ data, error, meta }"}</span>
        </li>
      </ul>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
