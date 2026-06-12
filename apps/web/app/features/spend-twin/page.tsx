import type { Metadata } from "next";
import { summarizeSpendTwin } from "@subradar/shared";

export const metadata: Metadata = {
  title: "Spend Twin — What your subscriptions really cost | Zeno",
  description: "Spend Twin turns abstract subscription totals into real-world tradeoffs you understand at a glance, computed locally from Zeno's encrypted subscription ledger.",
  openGraph: {
    title: "Spend Twin — What your subscriptions really cost | Zeno",
    description: "Turns abstract subscription totals into real-world tradeoffs, computed locally from your encrypted subscription ledger.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function SpendTwinFeaturePage() {
  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Spend Twin</h1>
      <p>
        {summarizeSpendTwin(28400)} It turns abstract subscription totals into tradeoffs people understand quickly.
      </p>
      <p>
        In the mobile app this stays local-first and uses the encrypted subscription ledger as its source.
      </p>
    </main>
  );
}
