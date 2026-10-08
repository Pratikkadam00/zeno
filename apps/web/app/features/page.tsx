import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { services } from "@zeno/service-catalog";
import { CardList } from "@/components/site/CardList";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";

// The hub for the feature pages: before it, /features was a 404 (measured on
// the live site, 2026-10-04). What is planned lives on /roadmap (D20) and is
// never shown here as available. Every claim below is one the truthfulness
// rail (app/truthfulness.test.tsx) pins to the app's code.
export const metadata: Metadata = pageMetadata({
  title: "Features: what Zeno does, in the app today",
  description:
    "Find subscriptions in receipts and statements you control, get warned before renewals, cancel with guides, budget, and share family totals. No bank login.",
  path: "/features"
});

export const FEATURES = [
  { href: "/features/spend-twin", name: "Spend Twin", note: "Your monthly total restated as everyday things, computed on your phone.", planned: false },
  { href: "/features/family-vault", name: "Family Vault", note: "One household, up to five people, totals per member, no shared lists.", planned: false },
  { href: "/roadmap", name: "Roadmap", note: "Widgets, optional bank connections, a team plan, an API: planned, not available today.", planned: true }
] as const;

export default function FeaturesPage() {
  return (
    <ContentShell
      eyebrow="Features"
      title="What Zeno does"
      lead="Zeno finds the subscriptions you pay for, warns you before each one charges, and walks you through cancelling, then checks that the charge stopped. It does this from receipts and statements you control. No bank login required."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Features", item: siteUrl("/features") }
          ]
        }}
      />

      <h2>Discovery you start</h2>
      <p>
        Connect a Gmail inbox, read-only, and tap scan: Zeno reads billing receipts and renewal notices on your phone. Or import a
        statement file exported from your bank. Or add a subscription by hand. Each charge is matched against a catalogue of{" "}
        {services.length} services, which fills in the usual price, the billing cycle and the cancellation guide. A scan runs when you
        tap it, and not otherwise.
      </p>

      <h2>Warnings before the charge</h2>
      <p>
        Seven days before a renewal, three days before, and on the morning it charges, each reminder carrying the amount due. Free
        trials get the same three warnings before they convert. Quiet hours are respected. A calendar shows what renews when.
      </p>

      <h2>Cancelling, then checking</h2>
      <p>
        One tap opens the guide for that service, step by step, with its known traps marked. The subscription is marked cancelled only
        when its renewal date passes with no new charge in the receipts or statements you scan or import. A charge that turns up anyway
        is flagged instead.
      </p>

      <h2>Budgets and insights</h2>
      <p>
        One monthly total for everything, with each subscription&rsquo;s price and cycle beside it. A monthly cap, category budgets and
        envelope budgeting on Pro. Price rises are flagged when a receipt shows a new amount. Everything is computed on the phone.
      </p>

      <h2>Your data, on your phone</h2>
      <p>
        The list is encrypted on the device. You can lock the app with a PIN, and with biometrics where your phone has them. Export the
        list as a file whenever you like, and delete your account from inside the app.
      </p>

      <h2>Deeper pages</h2>
      <CardList
        cards={FEATURES.map((f) => ({
          href: f.href,
          title: f.name,
          description: f.note,
          meta: f.planned ? "Planned · not available today" : "In the app",
          cta: "Learn more"
        }))}
      />
      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
