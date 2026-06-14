import { ComingSoon } from "../src/components/ComingSoon";

export default function FamilyScreen() {
  return (
    <ComingSoon
      title="Family"
      tagline="One shared view for the whole household's subscriptions, with per-person breakdowns."
      points={[
        "Invite up to 5 household members",
        "A shared family subscription vault",
        "Per-member spend breakdowns",
        "Catch duplicate subscriptions across the family"
      ]}
    />
  );
}
