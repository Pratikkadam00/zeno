export default function OpenBankingFeaturePage() {
  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Optional Open Banking</h1>
      <p>
        Plaid and MX are modeled as read-only OAuth adapters. SubRadar sees transactions, not login credentials, and the core app works without this premium connection.
      </p>
      <ol className="steps">
        <li>User starts a provider-hosted connection.</li>
        <li>Provider returns a read-only token reference.</li>
        <li>Recurring charges are normalized locally before confirmation.</li>
      </ol>
    </main>
  );
}
