import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import hubStyles from "../cancel/cancel-hub.module.css";

// The hub for the comparison pages: before it, /compare was a 404 and the five
// pages were reachable only from the footer (measured on the live site,
// 2026-10-04). A hub gives crawlers and people one path to all of them.
export const metadata: Metadata = {
  title: "Compare Zeno with other subscription trackers | Zeno",
  description:
    "How Zeno compares with Rocket Money, Monarch, YNAB and other subscription trackers and budget apps: no bank login, discovery from receipts and statements you control, encrypted on your device.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Compare Zeno with other subscription trackers | Zeno",
    description: "No bank login, discovery from receipts and statements you control, encrypted on your device.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export const COMPARISONS = [
  { href: "/compare/no-bank-login", name: "A subscription tracker without bank login", note: "What changes when an app never asks for your bank credentials." },
  { href: "/compare/rocket-money-alternative", name: "Rocket Money alternative without Plaid", note: "Rocket Money connects through Plaid; Zeno doesn't need a bank connection at all." },
  { href: "/compare/monarch-alternative", name: "Monarch alternative with no bank sync to break", note: "Manual and imported data that never silently stops syncing." },
  { href: "/compare/ynab-alternative", name: "YNAB alternative as a one-time purchase", note: "Pro is a one-time purchase, not a yearly plan." },
  { href: "/compare/budget-app-no-bank-sync", name: "A budget app that doesn't connect to your bank", note: "Budgets built on subscriptions you entered or imported yourself." }
] as const;

export default function ComparePage() {
  return (
    <ContentShell
      eyebrow="Comparisons"
      title="How Zeno compares"
      lead="Zeno finds and tracks subscriptions from email receipts and statements you control, with no bank login. Each page below compares that with one other app or kind of app."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Comparisons", item: siteUrl("/compare") }
          ]
        }}
      />
      <ul className={hubStyles.relatedGrid}>
        {COMPARISONS.map((c) => (
          <li key={c.href}>
            <Link href={c.href}>{c.name}</Link>
            <p>{c.note}</p>
          </li>
        ))}
      </ul>
      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
