import { ComingSoon } from "../src/components/ComingSoon";

export default function BusinessScreen() {
  return (
    <ComingSoon
      title="Business"
      tagline="Track company subscriptions, seats, and renewal load across your team — without turning Zeno into a bank-data warehouse."
      points={[
        "See every team subscription and who owns it",
        "Seats and roles, with finance-only access",
        "SaaS spend reporting with CSV / API export",
        "Renewal load for the next 30 days at a glance"
      ]}
    />
  );
}
