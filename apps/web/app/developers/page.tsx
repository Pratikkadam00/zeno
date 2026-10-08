import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { createPublicApiKeyPreview, type PublicApiKey } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Public API for developers",
  description:
    "Build on Zeno's public API: scoped keys with masked previews, read and write scopes, and one response envelope. Raw financial data stays on your device.",
  path: "/developers"
});

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
      eyebrow="Developers · Planned · not available today"
      title="Public API"
      lead="A public API is planned, not available today. As designed, it uses scoped keys, masked previews, and explicit read/write scopes, and your raw financial data stays on your device. It would not be exposed through the API. The key below is an example."
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
