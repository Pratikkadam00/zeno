import { summarizeSpendTwin } from "@subradar/shared";

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
