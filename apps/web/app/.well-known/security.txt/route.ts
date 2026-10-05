import { CONTACT_EMAIL, siteUrl } from "@/lib/site";

// RFC 9116 security.txt (P8): where to report a vulnerability, on the site's own
// domain. Built at deploy time, so Expires moves forward with every deploy and
// always stays inside the RFC's "less than a year" (here 180 days).
export const dynamic = "force-static";

export const EXPIRES_AFTER_DAYS = 180;

export function GET(): Response {
  const expires = new Date(Date.now() + EXPIRES_AFTER_DAYS * 24 * 60 * 60 * 1000);
  expires.setUTCHours(0, 0, 0, 0);
  const body = [
    `Contact: mailto:${CONTACT_EMAIL.security}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${siteUrl("/.well-known/security.txt")}`,
    "Policy: https://github.com/Pratikkadam00/zeno/blob/main/SECURITY.md",
    ""
  ].join("\n");
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
