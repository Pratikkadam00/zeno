import type { Metadata } from "next";
import { createBusinessSummary, demoBusinessWorkspace } from "@subradar/shared";

export const metadata: Metadata = {
  title: "Business Tier — Team subscription tracking | Zeno",
  description: "Track company subscriptions, finance seats, renewal load, and team spending with Zeno's Business Tier — without turning your tracker into a bank-data warehouse.",
  openGraph: {
    title: "Business Tier — Team subscription tracking | Zeno",
    description: "Track company subscriptions, finance seats, renewal load, and team spending with Zeno's Business Tier.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function BusinessFeaturePage() {
  const summary = createBusinessSummary(demoBusinessWorkspace, []);

  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Business Tier</h1>
      <p>
        Track company subscriptions, finance seats, renewal load, and team spending without turning SubRadar into a bank-data warehouse.
      </p>
      <ol className="steps">
        <li>{summary.workspaceName}</li>
        <li>{summary.seatCount} configured seats</li>
        <li>{summary.renewalCountNext30Days} renewals in the next 30 days in this empty demo snapshot</li>
      </ol>
    </main>
  );
}
