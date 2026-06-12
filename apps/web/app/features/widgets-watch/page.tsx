import type { Metadata } from "next";
import { createWidgetSnapshot } from "@subradar/shared";

export const metadata: Metadata = {
  title: "Widgets + Watch — Renewals at a glance | Zeno",
  description: "Zeno's home screen widgets and Apple Watch complications show your next renewal and monthly spend from a compact local snapshot — no raw financial records on the server.",
  openGraph: {
    title: "Widgets + Watch — Renewals at a glance | Zeno",
    description: "Home screen widgets and Apple Watch complications show your next renewal and monthly spend from a compact local snapshot.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

export default function WidgetsWatchFeaturePage() {
  const snapshot = createWidgetSnapshot([]);

  return (
    <main className="page narrow">
      <a href="/">SubRadar</a>
      <h1>Widgets + Watch</h1>
      <p>
        SubRadar widgets use a compact local snapshot for next renewal, monthly spend, and Apple Watch complication text.
      </p>
      <ol className="steps">
        <li>Snapshot generated locally: {snapshot.generatedAt}</li>
        <li>Complication fallback: {snapshot.watchComplicationText}</li>
        <li>Server does not need raw financial records to render widget data.</li>
      </ol>
    </main>
  );
}
