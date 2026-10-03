// @vitest-environment jsdom
import { services } from "@zeno/service-catalog";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { FAQS } from "@/components/site/faq-data";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { PRODUCT_EVENT_LABELS } from "../../api/src/metrics";
import { listPages, parse, renderPage } from "@/test-support/pages";
import GuidePage from "./cancel/[slug]/page";

// P4.1c: the truthfulness rail as a test. Two halves:
//  1. phrases the site must never say (and the one it must), over the text of
//     every page and every one of the 509 guides, as served;
//  2. each factual claim the site makes about the app, pinned to the code that
//     makes it true, so a change on either side fails here first.

vi.mock("./fonts", () => ({ fontClassNames: "fonts" }));

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

type Page = { url: string; text: string; doc: Document };
let pages: Page[] = [];
const textOf = (doc: Document) => {
  // FAQ answers are collapsed in the HTML (only the first is rendered); their
  // copy is checked from faq-data directly below.
  for (const s of doc.querySelectorAll("script, style")) s.remove();
  return (doc.body.textContent ?? "").replace(/\s+/g, " ");
};
const page = (url: string) => pages.find((p) => p.url === url)!;

beforeAll(async () => {
  vi.stubEnv("SHOW_PUBLIC_ANALYTICS", "1");
  const top = await Promise.all(
    listPages()
      .filter((p) => !p.route.includes("["))
      .map(async (p) => {
        const doc = parse((await renderPage(p)).html);
        return { url: p.route, doc, text: textOf(doc) };
      })
  );
  const guides = await Promise.all(
    services.map(async (s) => {
      const doc = parse(renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ slug: s.slug }) })));
      return { url: `/cancel/${s.slug}`, doc, text: textOf(doc) };
    })
  );
  pages = [...top, ...guides];
  vi.unstubAllEnvs();
}, 60_000);

describe("the rail: never said", () => {
  const BANNED: [string, RegExp][] = [
    ["an absolute on-device claim", /100\s*%\s*on[- ]?device/i],
    ["'we never see your data'", /we never see your data/i],
    ["automatic or background discovery", /(automatic(ally)?\s+(discover|detect|find|scan)\w*|(discover|detect|find|scan)\w*\s+automatically|(scans?|discovery|finds?)\s+in the background)/i],
    ["'no Plaid, ever'", /no plaid,?\s+ever|never (use|touch) plaid/i],
    ["the invented $219/yr figure", /\$\s?219\s*(\/\s*(yr|year)|(a|per) year)/i],
    ["unverified 'real' cancellation flows (F166 era wording)", /real cancellation (flow|steps)|statement shows no charge|until the charge actually stops/i]
  ];

  it.each(BANNED)("%s", (_what, pattern) => {
    const hits = pages.filter((p) => pattern.test(p.text)).map((p) => `${p.url}: …${p.text.match(pattern)![0]}…`);
    if (pattern.test(FAQS.map((f) => f.a).join(" "))) hits.push("FAQ");
    expect(hits).toEqual([]);
  });

  it("no 'Most popular' badge (the pricing copy may say it refuses one)", () => {
    const badges = pages.flatMap((p) => [...p.doc.querySelectorAll("body *")].filter((el) => el.children.length === 0 && /^\s*most popular\s*$/i.test(el.textContent ?? "")).map(() => p.url));
    expect(badges).toEqual([]);
  });

  it("the rail checks itself: each pattern catches the wording it bans", () => {
    for (const [phrase, ok] of [
      ["Zeno is 100% on-device.", false],
      ["Zeno automatically discovers your subscriptions", false],
      ["It scans in the background", false],
      ["no background collection, no bank login", true],
      ["Scans run when you tap scan", true]
    ] as const) {
      const banned = BANNED.some(([, p]) => p.test(phrase));
      expect([phrase, banned]).toEqual([phrase, !ok]);
    }
  });
});

describe("the rail: always said", () => {
  it("'No bank login required' is on every page (the footer carries it) and in the hero", () => {
    const missing = pages.filter((p) => !p.text.includes("No bank login required")).map((p) => p.url);
    expect(missing).toEqual([]);
    expect(page("/").doc.querySelector("#ledger")!.textContent).toContain("No bank login required");
  });
});

describe("claims pinned to the code that makes them true", () => {
  it("prices: the site's figures are the app's paywall figures", () => {
    const paywall = source("apps/mobile/app/paywall.tsx");
    const price = (key: string) => new RegExp(`${key}:\\s*"\\$([\\d.]+)"`).exec(paywall)![1];
    const home = page("/").text;
    expect(home).toContain(`Billed $${price("proAnnual")}/yr · or $${price("proMonthly")} monthly`);
    expect(home).toContain(`$${price("proLifetime")} once`);
    expect(home).toContain(`$${price("familyMonthly")} /mo`);
    // Pro's per-month figure is the annual price over 12, to the cent shown.
    expect(home).toContain(`$${(Number(price("proAnnual")) / 12).toFixed(2)} /mo`);
    expect(page("/compare/ynab-alternative").text).toContain(`$${price("proLifetime")}`);
  });

  it("the free plan: 'up to 10 subscriptions' is the limit every app screen enforces", () => {
    for (const file of ["apps/mobile/app/(tabs)/dashboard.tsx", "apps/mobile/app/(tabs)/discover.tsx", "apps/mobile/app/subscription/add.tsx"]) {
      expect([file, /const FREE_LIMIT = (\d+);/.exec(source(file))?.[1]]).toEqual([file, "10"]);
    }
    expect(page("/").text).toContain("Track up to 10 subscriptions");
  });

  it("reminders: 7 days, 3 days and the day itself, at 9 AM, carrying the amount, shifted out of quiet hours", () => {
    const service = source("apps/mobile/src/notifications/notificationService.ts");
    for (const days of [7, 3, 0]) expect(service).toMatch(new RegExp(`daysBefore: ${days},\\s*\\n\\s*title: \`[^\`]*\`,\\s*\\n\\s*body: \`\\$\\{amount\\}`));
    expect(service).toContain("getNineAmTriggerDate(renewalDate, plan.daysBefore)");
    expect(service).toContain("shiftOutOfQuietHours(baseTrigger, quietHours)");
    expect(page("/").text).toContain("Seven days out, three days out, and the morning of. Every reminder carries the amount due, with quiet hours respected.");
  });

  it("F166: 'verified' means the renewal date passed with no charge recorded since the request — and the site says exactly that", () => {
    const store = source("apps/mobile/src/data/subscription-store.tsx");
    expect(store).toContain("const stillCharged = !Number.isNaN(chargedMs) && chargedMs >= requestedMs;");
    expect(store).toContain('status: stillCharged ? "attention" : "cancelled"');
    const home = page("/").text;
    expect(home).toContain("nothing is marked cancelled until the renewal date passes with no new charge in your receipts or statements, and a charge that shows up anyway gets flagged");
    expect(home).toContain("IN THE APP, A CANCELLATION IS MARKED VERIFIED ONLY ONCE ITS RENEWAL DATE PASSES WITH NO NEW CHARGE IN THE RECEIPTS OR STATEMENTS YOU SCAN OR IMPORT.");
  });

  it("guides: the site no longer says every service has its own written steps (39 of 509 do; the rest carry general steps)", () => {
    const general = (name: string) => [`Go to ${name} and sign in`, "Open Account, Profile, or Settings"];
    const written = services.filter((s) => s.cancelGuide.slice(0, 2).join("|") !== general(s.name).join("|"));
    expect(written.length).toBeLessThan(services.length);
    expect(page("/").text).toContain("each with a cancellation guide to follow");
  });

  it("the app lock is optional (off until the user turns it on), and the FAQ says 'you can lock'", () => {
    expect(source("apps/mobile/src/security/lock-store.ts")).toMatch(/enabled: false,/);
    expect(FAQS.find((f) => f.q === "Is my data private?")!.a).toContain("you can lock the app with a PIN");
  });

  it("features the app shows as 'Coming soon' or 'Preview only' are marked 'not available today' on the site", () => {
    const pairs: [string, string][] = [
      ["apps/mobile/app/business.tsx", "/features/business"],
      ["apps/mobile/app/public-api.tsx", "/developers"],
      ["apps/mobile/app/partners.tsx", "/partners"],
      ["apps/mobile/app/widgets.tsx", "/features/widgets-watch"],
      ["apps/mobile/app/open-banking.tsx", "/features/open-banking"]
    ];
    for (const [screen, url] of pairs) {
      const unavailable = /ComingSoon|NotInThisBuild|Preview only|not available/i.test(source(screen));
      expect([screen, unavailable]).toEqual([screen, true]);
      expect([url, page(url).text.includes("not available today")]).toEqual([url, true]);
    }
  });

  it("privacy policy: the product events it lists are exactly the ones the server accepts", () => {
    expect(Object.keys(PRODUCT_EVENT_LABELS).sort()).toEqual(["free_cap_hit", "import_completed", "paywall_purchase_completed", "share_card_generated"]);
    const privacy = page("/legal/privacy").text;
    for (const words of ["an import finishing (CSV or email)", "a share card being made", "the free plan’s limit being reached", "which plan a purchase was"]) {
      expect(privacy).toContain(words);
    }
    // The app sends them with no Authorization header.
    expect(source("apps/mobile/src/api/client.ts")).toMatch(/fetch\(`\$\{getApiBaseUrl\(\)\}\/events`, \{\s*method: "POST",\s*headers: \{ "Content-Type": "application\/json" \},/);
  });

  it("privacy policy: sign-in links expire when it says, and it names every AI provider the code can send to", () => {
    expect(source("apps/api/src/routes/auth.ts")).toContain("const magicLinkTtlSeconds = 10 * 60;");
    const privacy = page("/legal/privacy").text;
    expect(privacy).toContain("expire after 10 minutes");
    const coach = source("apps/api/src/coach.ts");
    expect(coach).toContain("COACH_PROVIDER=anthropic");
    expect(coach).toContain("COACH_PROVIDER=groq");
    expect(privacy).toContain("Anthropic (Claude) or Groq");
  });

  it("privacy policy: the waitlist records exactly what it says (the address and the time)", () => {
    const route = source("apps/web/app/api/waitlist/route.ts");
    expect(route).toContain("const record = JSON.stringify({ email, at: new Date().toISOString() });");
    expect(page("/legal/privacy").text).toContain("we record your email address and the date and time you signed up");
  });

  it("cookie policy: the site sets no cookie, and the one stored item it names is the theme key", () => {
    const code = ["components/site/Nav.tsx", "lib/theme.ts", "components/site/WaitlistForm.tsx", "app/layout.tsx"].map((f) => source(`apps/web/${f}`)).join("\n");
    expect(code).not.toMatch(/document\.cookie|cookies\(\)|sessionStorage|indexedDB/);
    expect([...code.matchAll(/localStorage\.setItem\(([^,]+),/g)].map((m) => m[1])).toEqual(["THEME_STORAGE_KEY"]);
    const cookies = page("/legal/cookies").text;
    expect(cookies).toContain("no cookies");
    expect(cookies).toContain(THEME_STORAGE_KEY);
    expect(cookies).not.toMatch(/consent controls|remember your cookie preference/);
  });

  it("competitors: Monarch is not said to require a bank connection (its help center documents manual accounts and CSV upload)", () => {
    const monarch = page("/compare/monarch-alternative").text;
    expect(monarch).not.toMatch(/connection required\s*No\s*Yes/i);
    expect(monarch).toContain("manual accounts");
  });

  it("the sample analytics dashboard says sample data, never 'Live'", () => {
    const dash = page("/analytics");
    expect(dash.text).not.toMatch(/\bLive\b/);
    expect(dash.text).toContain("Sample data");
  });
});
