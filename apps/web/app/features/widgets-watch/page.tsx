import { createWidgetSnapshot } from "@subradar/shared";

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
