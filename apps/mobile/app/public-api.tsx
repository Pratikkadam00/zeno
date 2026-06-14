import { ComingSoon } from "../src/components/ComingSoon";

export default function PublicApiScreen() {
  return (
    <ComingSoon
      title="Public API"
      tagline="A scoped API for power users to build on top of their own Zeno data."
      points={[
        "Scoped, revocable API keys",
        "Read your subscriptions & analytics programmatically",
        "Consistent { data, error, meta } responses",
        "Key material is shown once and never stored in plaintext"
      ]}
    />
  );
}
