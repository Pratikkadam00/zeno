import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTACT_EMAIL, siteUrl } from "@/lib/site";
import { EXPIRES_AFTER_DAYS, GET } from "./.well-known/security.txt/route";

// RFC 9116 (P8): /.well-known/security.txt names where to report a
// vulnerability. The RFC requires Contact and Expires, Expires less than a year
// ahead; a Canonical line must be the file's own address.
afterEach(() => vi.useRealTimers());

const fields = (text: string) => new Map(text.trim().split("\n").map((line) => {
  const at = line.indexOf(": ");
  return [line.slice(0, at), line.slice(at + 2)] as const;
}));

describe("/.well-known/security.txt", () => {
  it("names the security contact on the site's own domain, the policy, and its own address", async () => {
    const response = GET();
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const f = fields(await response.text());
    expect(f.get("Contact")).toBe(`mailto:${CONTACT_EMAIL.security}`);
    expect(f.get("Canonical")).toBe(siteUrl("/.well-known/security.txt"));
    expect(f.get("Policy")).toBe("https://github.com/Pratikkadam00/zeno/blob/main/SECURITY.md");
    expect(f.get("Preferred-Languages")).toBe("en");
  });

  it("expires 180 days after the build, at midnight UTC: in the future and under a year", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-05T19:30:00.000Z"));
    const expires = fields(await GET().text()).get("Expires")!;
    expect(expires).toBe("2027-04-03T00:00:00.000Z");
    const ahead = new Date(expires).getTime() - Date.now();
    expect(ahead).toBeGreaterThan(0);
    expect(ahead).toBeLessThan(365 * 24 * 60 * 60 * 1000);
    expect(EXPIRES_AFTER_DAYS).toBeLessThan(365);
  });
});
