import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Optional Open Banking — Read-only bank connections | Zeno",
  description: "Zeno's optional open banking uses Plaid and MX as read-only OAuth adapters: it sees transactions, never login credentials, and the core app works without connecting a bank.",
  openGraph: {
    title: "Optional Open Banking — Read-only bank connections | Zeno",
    description: "Read-only Plaid and MX adapters: Zeno sees transactions, never login credentials, and works without a bank connection.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

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
