import { createBusinessSummary, demoBusinessWorkspace } from "@subradar/shared";

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
