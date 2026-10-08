import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { listPartnerIntegrations } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";

// D20 (docs/OWNER_ACTIONS.md): the five "planned, not available today" pages
// (widgets and watch, open banking, business, developers, partners) folded
// into this one page. Their old addresses redirect here (next.config.ts). The
// app's own screens for these features say "coming soon" or "preview only";
// app/truthfulness.test.tsx pairs each of them with this page, which must say
// "not available today" for as long as that is true.
export const metadata: Metadata = pageMetadata({
  title: "Roadmap: what is planned, and what is not here yet",
  description:
    "What Zeno plans after launch: widgets, optional read-only bank connections, a team plan, a public API, integrations. None is available today.",
  path: "/roadmap"
});

const PLANNED = [
  {
    name: "Widgets and a watch complication",
    body: "A home-screen widget and an Apple Watch complication showing the next renewal and the monthly total. They would read a small snapshot made on the phone, so no server would need your subscription records to draw them."
  },
  {
    name: "Optional read-only bank connections",
    body: "For people who want them, a bank connection through a regulated provider such as Plaid or MX: read-only, started by you, and seeing transactions but never your login. The app will keep working fully without one. Everything Zeno does today runs on receipts and statements you control, and that stays the default."
  },
  {
    name: "A plan for teams",
    body: "Company subscriptions, seats, and the renewal load for a small team, kept to the same rule as the personal app: no bank-data warehouse. Whether this ships depends on whether people ask for it."
  },
  {
    name: "A public API",
    body: "Scoped keys with read and write permissions and masked previews, for people who want to build on their own data. Raw financial data would stay on the phone; the API would not expose it."
  }
] as const;

export default function RoadmapPage() {
  const integrations = listPartnerIntegrations();
  return (
    <ContentShell
      eyebrow="Roadmap · planned, not available today"
      title="What is planned, and what is not here yet"
      lead="Zeno is pre-launch. The app that reaches the stores does discovery from receipts and statements, reminders, cancellation guides with verification, budgets, and family sharing. The items on this page come after that, in an order that can change. None is available today, and none has a date."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Roadmap", item: siteUrl("/roadmap") }
          ]
        }}
      />

      {PLANNED.map((item) => (
        <section key={item.name}>
          <h2>{item.name}</h2>
          <p>{item.body}</p>
        </section>
      ))}

      <h2>Integrations we are considering</h2>
      <p>
        Each name below is a service Zeno may connect to, so that your list can go where you already work. None is built, and none is a
        partnership. Any export of your data would start from a button you press.
      </p>
      <ul className={styles.list}>
        {integrations.map((integration) => (
          <li key={integration.id}>
            <span>{integration.name}</span>
            <span className={styles.tag}>{integration.status.replace("_", " ")}</span>
          </li>
        ))}
      </ul>

      <h2>What is in the app today</h2>
      <p>
        The <Link href="/features">features page</Link> lists what the app does now. If something here matters to you, say so when you
        join the waitlist: the order of this list is decided by what people ask for.
      </p>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
