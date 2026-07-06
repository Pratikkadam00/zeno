"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./cancel-hub.module.css";

export type HubService = { name: string; slug: string; category: string };

// Richer, browsing-friendly labels for the catalog's internal category codes
// (packages/service-catalog's ServiceCategory — verified: streaming, ai_tools,
// productivity, gaming, health, finance, education, music, cloud, security,
// other). Falls back to the raw code for anything unmapped.
const CATEGORY_LABELS: Record<string, string> = {
  streaming: "Streaming & Entertainment",
  ai_tools: "AI Tools",
  productivity: "Productivity",
  gaming: "Gaming",
  health: "Health & Fitness",
  finance: "Finance",
  education: "Education",
  music: "Music",
  cloud: "Cloud & Storage",
  security: "Security & Privacy",
  other: "Other"
};

// The initial (empty-query) render includes every service, so the full
// directory is present in the server-rendered HTML for crawlers — the search
// input only narrows what's already there, it never gates it behind JS.
export function CancelHubBrowser({ services }: { services: HubService[] }) {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? services.filter((service) => service.name.toLowerCase().includes(q)) : services;
    const byCategory = new Map<string, HubService[]>();
    for (const service of filtered) {
      const list = byCategory.get(service.category) ?? [];
      list.push(service);
      byCategory.set(service.category, list);
    }
    return [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [query, services]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${services.length}+ services…`}
        aria-label="Search cancellation guides"
        className={styles.search}
      />

      {grouped.length === 0 ? (
        <p className={styles.empty}>No services match &quot;{query}&quot;. Try a different search, or check back — Zeno&apos;s catalog keeps growing.</p>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} className={styles.categorySection}>
            <h2 className={styles.categoryHeading}>
              {CATEGORY_LABELS[category] ?? category} ({items.length})
            </h2>
            <ul className={styles.grid}>
              {items.map((service) => (
                <li key={service.slug}>
                  <Link href={`/cancel/${service.slug}`}>{service.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
