// True when a parsed deep link's trailing path segments are `auth/verify`.
//
// Robust across the two ways the magic link is parsed:
//   - standalone custom-scheme build: `zeno://auth/verify` → host "auth", path "verify"
//   - Expo Go dev: `exp://<ip>/--/auth/verify` → host "<ip>", path "auth/verify"
// Matching on the last two segments (not the whole path, and not a substring)
// means both forms match while a lookalike host like "evilauth" does not.
export function isAuthVerifyLink(hostname: string | null | undefined, path: string | null | undefined): boolean {
  const segments = `${hostname ?? ""}/${path ?? ""}`.split("/").filter(Boolean);
  if (segments.length < 2) return false;
  return segments[segments.length - 2] === "auth" && segments[segments.length - 1] === "verify";
}
