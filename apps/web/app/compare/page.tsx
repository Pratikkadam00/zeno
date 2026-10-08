import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { CardList } from "@/components/site/CardList";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";

// The hub for the comparison pages: before it, /compare was a 404 and the five
// pages were reachable only from the footer (measured on the live site,
// 2026-10-04). A hub gives crawlers and people one path to all of them.
export const metadata: Metadata = pageMetadata({
  title: "Compare Zeno with other subscription trackers",
  description:
    "How Zeno compares with Rocket Money, Monarch, YNAB and others: no bank login, discovery from receipts and statements you control, encrypted on your device.",
  path: "/compare"
});

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
      <p>
        Each comparison states what the other app does from its own public pages, with the date it was read, and what Zeno does from the
        code that makes it true. Prices are quoted as published and can change; the page says when it last checked. None of these pages
        claims the other app is unsafe. The difference is the bank connection: those apps are built around one, and Zeno is built to work
        without one, from receipts and statements you already have.
      </p>
      <CardList cards={COMPARISONS.map((c) => ({ href: c.href, title: c.name, description: c.note, cta: "See the comparison" }))} />
      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
