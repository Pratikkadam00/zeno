import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canaryNames, findCanaries, kindOf, makeCanaries, namesIn, needles, repositoryNames } from "./build-secret-scan.mjs";

describe("namesIn: every way the repository names an environment variable", () => {
  it("reads code, render.yaml, .env examples and workflow secrets", () => {
    const names = namesIn([
      `const a = process.env.ANTHROPIC_API_KEY; const b = process.env["DATABASE_URL"];`,
      "envVars:\n  - key: RESEND_API_KEY\n    sync: false",
      "API_PORT=8787\n# COMMENTED=1\n",
      "token: ${{ secrets.EXPO_TOKEN }}"
    ]);
    expect([...names].sort()).toEqual(["ANTHROPIC_API_KEY", "API_PORT", "DATABASE_URL", "EXPO_TOKEN", "RESEND_API_KEY"]);
  });
});

describe("canaryNames", () => {
  it("leaves out the public-by-design prefixes and the build's own controls", () => {
    expect(canaryNames(new Set(["NEXT_PUBLIC_SITE_URL", "EXPO_PUBLIC_SENTRY_DSN", "NODE_ENV", "TZ", "CI", "BABEL_ENV", "WAITLIST_WEBHOOK_URL", "API_PORT"]))).toEqual([
      "API_PORT",
      "WAITLIST_WEBHOOK_URL"
    ]);
  });

  it("the repository's list covers the website's secret and the API's (and only tracked files count)", () => {
    const names = canaryNames(repositoryNames());
    for (const name of ["WAITLIST_WEBHOOK_URL", "WAITLIST_FILE", "TRUST_PROXY_HOPS", "ANTHROPIC_API_KEY", "DATABASE_URL", "JWT_PRIVATE_KEY", "STORAGE_ENCRYPTION_KEY", "REVENUECAT_SECRET_KEY", "PLAID_SECRET"]) {
      expect(names, name).toContain(name);
    }
    expect(names).not.toContain("NEXT_PUBLIC_SITE_URL");
    expect(names).not.toContain("NODE_ENV");
  });
});

describe("makeCanaries", () => {
  it("one per name, letters and digits only (no escaping can alter it), all different", () => {
    const c = makeCanaries(["WAITLIST_WEBHOOK_URL", "API_PORT"], "a1b2");
    expect(c).toEqual({ WAITLIST_WEBHOOK_URL: "zncanarywaitlistwebhookurla1b2", API_PORT: "zncanaryapiporta1b2" });
    const fresh = makeCanaries(["X"]);
    expect(fresh.X).toMatch(/^zncanaryx[0-9a-f]{12}$/);
    expect(makeCanaries(["X"]).X).not.toBe(fresh.X);
  });
});

describe("needles", () => {
  it("find the canary as written, and base64-encoded wherever it falls in the encoded stream", () => {
    const canary = "zncanarywaitlistwebhookurl0123456789ab";
    const list = needles(canary);
    expect(list[0]!.toString()).toBe(canary);
    for (let before = 0; before < 12; before++) {
      for (let after = 0; after < 4; after++) {
        const encoded = Buffer.from(Buffer.concat([randomBytes(before), Buffer.from(canary), randomBytes(after)]).toString("base64"));
        expect(list.some((n) => encoded.includes(n)), `${before} bytes before, ${after} after`).toBe(true);
      }
    }
  });

  it("don't match text that merely shares the canary's start", () => {
    const list = needles("zncanaryapiport0123456789ab");
    const other = Buffer.from(Buffer.from("zncanaryapiportFFFFFFFFFFFF").toString("base64"));
    expect(list.some((n) => other.includes(n))).toBe(false);
  });
});

describe("kindOf", () => {
  it("reads the kinds the build writes, skips the fonts, and flags anything else", () => {
    expect(kindOf("index.html")).toBe("readable");
    expect(kindOf("page.rsc")).toBe("readable");
    expect(kindOf(".previewinfo")).toBe("readable");
    expect(kindOf("BUILD_ID")).toBe("readable");
    expect(kindOf("latin.woff2")).toBe("opaque");
    expect(kindOf("00000003.sst")).toBe("unknown");
    expect(kindOf("bundle.js.gz")).toBe("unknown");
    expect(kindOf("SOMETHING")).toBe("unknown");
  });
});

describe("findCanaries", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });

  it("names each variable and file a value appears in, as written or base64, and each file it can't read", () => {
    dir = mkdtempSync(join(tmpdir(), "scan-"));
    mkdirSync(join(dir, "server", "app"), { recursive: true });
    const canaries = makeCanaries(["WAITLIST_WEBHOOK_URL", "GROQ_API_KEY", "API_PORT"], "c0ffee");
    writeFileSync(join(dir, "server", "app", "index.html"), `<span>${canaries.WAITLIST_WEBHOOK_URL}</span>`);
    writeFileSync(join(dir, "server", "app", "index.rsc"), `x:${Buffer.from(`k=${canaries.GROQ_API_KEY};`).toString("base64")}`);
    writeFileSync(join(dir, "clean.js"), "console.log(1)");
    writeFileSync(join(dir, "font.woff2"), canaries.API_PORT); // a font is skipped by design
    writeFileSync(join(dir, "00000001.sst"), "compressed");
    const { hits, unreadable } = findCanaries(dir, canaries);
    expect(hits.map(([name, file]) => [name, file.slice(dir.length + 1).replace(/\\/g, "/")]).sort()).toEqual([
      ["GROQ_API_KEY", "server/app/index.rsc"],
      ["WAITLIST_WEBHOOK_URL", "server/app/index.html"]
    ]);
    expect(unreadable.map((f) => f.slice(dir.length + 1))).toEqual(["00000001.sst"]);
  });

  it("finds nothing in a clean tree", () => {
    dir = mkdtempSync(join(tmpdir(), "scan-"));
    writeFileSync(join(dir, "index.html"), "<p>hello</p>");
    expect(findCanaries(dir, makeCanaries(["WAITLIST_WEBHOOK_URL"]))).toEqual({ hits: [], unreadable: [] });
  });
});
