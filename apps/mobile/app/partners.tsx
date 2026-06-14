import { ComingSoon } from "../src/components/ComingSoon";

export default function PartnersScreen() {
  return (
    <ComingSoon
      title="Partners"
      tagline="Connect Zeno to the finance apps, spreadsheets, and automations you already use."
      points={[
        "One-tap integrations with finance & budgeting apps",
        "Export your subscriptions to a spreadsheet",
        "Automation hooks (webhooks) for power users",
        "You approve every data export — nothing leaves without consent"
      ]}
    />
  );
}
