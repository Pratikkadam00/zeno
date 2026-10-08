// W4 (docs/WEB_PLAN.md): every picture on the website, drawn here as SVG in
// the site's own palette and rendered with sharp. Nothing is downloaded or
// copied: the illustrations are vector art written in this file, and the data
// figures are computed from the service catalogue at render time, so a figure
// can never disagree with the post beside it.
//
//   npx tsx scripts/site-art.ts        → apps/web/public/art/<name>.webp (1200 wide) and <name>-600.webp
//                                       → apps/web/public/og/<slug>.png (1200 × 630), one per page
//
// The outputs are committed; app/art.test.tsx checks they exist, their size
// and dimensions, and that every post's pictures have alt text. Re-run after
// changing a drawing, a title, or the catalogue.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { services } from "@zeno/service-catalog";
import { OG_PAGES, ogSlug } from "../apps/web/lib/og-pages";
import { SITE_HOST } from "../apps/web/lib/site";
import { POSTS, fillFigures } from "../apps/web/app/blog/posts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "apps/web");
const ART_DIR = join(WEB, "public/art");
const OG_DIR = join(WEB, "public/og");

// ── Palette: the site's own tokens, read from globals.css, never retyped ──
const css = readFileSync(join(WEB, "app/globals.css"), "utf8");
const token = (name: string): string => {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!m) throw new Error(`no token --${name} in globals.css`);
  return m[1]!.trim();
};
const P = {
  paper: token("paper"),
  card: token("paper-card"),
  desk: token("desk"),
  ink: token("ink"),
  ink2: token("ink-2"),
  ink3: token("ink-3"),
  rule: token("rule"),
  ruleStrong: token("rule-strong"),
  green: token("green"),
  greenText: token("green-text"),
  verified: token("stamp-verified"),
  alert: token("stamp-alert"),
  warn: token("warn"),
  info: token("info")
};
const SANS = "Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "Consolas, Menlo, DejaVu Sans Mono, monospace";

// ── Helpers ─────────────────────────────────────────────────────────────
export const HERO = { w: 1200, h: 675 };
export const FIGURE = { w: 1200, h: 700 };
const OG = { w: 1200, h: 630 };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function paper(w: number, h: number, body: string, { baselines = true } = {}): string {
  const lines = baselines
    ? Array.from({ length: Math.floor(h / 36) }, (_, i) => `<line x1="0" y1="${36 * (i + 1)}" x2="${w}" y2="${36 * (i + 1)}" stroke="${P.ink}" stroke-opacity="0.065" stroke-width="1"/>`).join("")
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${P.paper}"/>${lines}${body}</svg>`;
}

const text = (x: number, y: number, s: string, o: { size?: number; weight?: number; fill?: string; mono?: boolean; anchor?: string; spacing?: number } = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${o.size ?? 24}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? P.ink}" text-anchor="${o.anchor ?? "start"}"${o.spacing ? ` letter-spacing="${o.spacing}"` : ""}>${esc(s)}</text>`;

const kicker = (x: number, y: number, s: string) => `<rect x="${x}" y="${y - 13}" width="11" height="3" fill="${P.green}"/>${text(x + 20, y, s.toUpperCase(), { size: 14, weight: 700, mono: true, fill: P.ink3, spacing: 2.5 })}`;

const tick = (x: number, y: number, color = P.green) => `<path d="M${x} ${y} l6 6 l12 -13" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

/** A ledger row: name, a dotted leader, a mono amount. */
function row(x: number, y: number, w: number, name: string, amount: string, o: { color?: string; strike?: boolean; sub?: string } = {}): string {
  const nameW = name.length * 12 + 24;
  const amtW = amount.length * 13 + 16;
  return (
    `${text(x, y, name, { size: 22, weight: 600, fill: o.strike ? P.ink3 : P.ink })}` +
    (o.strike ? `<line x1="${x - 4}" y1="${y - 8}" x2="${x + nameW - 20}" y2="${y - 8}" stroke="${P.alert}" stroke-width="2.5"/>` : "") +
    `<line x1="${x + nameW}" y1="${y - 4}" x2="${x + w - amtW}" y2="${y - 4}" stroke="${P.ink3}" stroke-width="1.5" stroke-dasharray="1 6" stroke-linecap="round"/>` +
    `${text(x + w, y, amount, { size: 22, weight: 600, mono: true, fill: o.color ?? P.ink, anchor: "end" })}` +
    (o.sub ? text(x, y + 24, o.sub.toUpperCase(), { size: 12, mono: true, fill: P.ink3, spacing: 1.5 }) : "")
  );
}

/** A labelled box with a drop rule beneath. */
function card(x: number, y: number, w: number, h: number, body: string, { fill = P.card }: { fill?: string } = {}): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${P.ruleStrong}"/>${body}`;
}

/** Wrap a title into lines of at most `max` characters, on word boundaries. */
function wrap(s: string, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of s.split(" ")) {
    if ((line + " " + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) out.push(line);
  return out;
}

// ── Catalogue figures: computed, never typed ─────────────────────────────
const DIFF_ORDER = ["easy", "medium", "hard", "dark_pattern"] as const;
const DIFF_LABEL: Record<(typeof DIFF_ORDER)[number], string> = { easy: "Easy", medium: "Medium", hard: "Hard", dark_pattern: "Dark pattern" };
const DIFF_COLOR: Record<(typeof DIFF_ORDER)[number], string> = { easy: P.verified, medium: P.info, hard: P.warn, dark_pattern: P.alert };
const countBy = <K extends string>(keys: readonly K[], key: (s: (typeof services)[number]) => K) =>
  Object.fromEntries(keys.map((k) => [k, services.filter((s) => key(s) === k).length])) as Record<K, number>;

export const STATS = {
  total: services.length,
  difficulty: countBy(DIFF_ORDER, (s) => s.cancelDifficulty),
  prices: services.map((s) => s.defaultMonthlyPrice).filter((p): p is number => p != null).sort((a, b) => a - b),
  categories: [...new Set(services.map((s) => s.category))].sort()
};

// ── The drawings ────────────────────────────────────────────────────────
const drawings: Record<string, () => string> = {
  // Hero: the three places subscriptions hide (inbox, store, statement).
  "find-three-places": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "Where subscriptions hide"),
      // Inbox
      card(80, 130, 320, 420, [
        text(110, 180, "Inbox", { size: 28, weight: 700 }),
        ...[0, 1, 2, 3, 4].map((i) => `<rect x="110" y="${210 + i * 58}" width="${i === 1 || i === 3 ? 240 : 200}" height="14" rx="7" fill="${i === 1 || i === 3 ? P.green : P.rule}"/><rect x="110" y="${232 + i * 58}" width="${150 - i * 10}" height="8" rx="4" fill="${P.rule}"/>`),
        text(110, 520, "RECEIPT · RENEWAL · INVOICE", { size: 12, mono: true, fill: P.ink3, spacing: 1.5 })
      ].join("")),
      // Store
      card(440, 130, 320, 420, [
        text(470, 180, "App store", { size: 28, weight: 700 }),
        `<rect x="470" y="210" width="260" height="300" rx="20" fill="${P.desk}" stroke="${P.ruleStrong}"/>`,
        ...[0, 1, 2].map((i) => `<rect x="494" y="${250 + i * 80}" width="44" height="44" rx="10" fill="${[P.alert, P.info, P.green][i]}"/><rect x="552" y="${262 + i * 80}" width="150" height="10" rx="5" fill="${P.ruleStrong}"/><rect x="552" y="${280 + i * 80}" width="90" height="8" rx="4" fill="${P.rule}"/>`),
        text(470, 540, "SETTINGS → SUBSCRIPTIONS", { size: 12, mono: true, fill: P.ink3, spacing: 1.5 })
      ].join("")),
      // Statement
      card(800, 130, 320, 420, [
        text(830, 180, "Statement", { size: 28, weight: 700 }),
        row(830, 240, 260, "Netflix", "15.99"),
        row(830, 300, 260, "Spotify", "10.99"),
        row(830, 360, 260, "Grocery", "84.20", { color: P.ink3 }),
        row(830, 420, 260, "iCloud+", "2.99"),
        row(830, 480, 260, "Petrol", "61.00", { color: P.ink3 }),
        text(830, 530, "EXPORTED CSV, READ ON YOUR PHONE", { size: 12, mono: true, fill: P.ink3, spacing: 1.5 })
      ].join("")),
      text(80, 620, "Three searches. One list. No bank login.", { size: 26, weight: 600, fill: P.ink2 })
    ].join("")),

  // Figure: the Gmail search, as typed.
  "gmail-search": () =>
    paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, "The search, pasted into the box"),
      `<rect x="80" y="130" width="1040" height="84" rx="42" fill="${P.card}" stroke="${P.ruleStrong}" stroke-width="2"/>`,
      `<circle cx="130" cy="172" r="12" fill="none" stroke="${P.ink2}" stroke-width="3"/><line x1="139" y1="181" x2="150" y2="192" stroke="${P.ink2}" stroke-width="3" stroke-linecap="round"/>`,
      text(170, 182, 'subject:(receipt OR invoice OR renewal OR "your subscription") newer_than:1y', { size: 22, mono: true }),
      ...[
        ["Your Netflix receipt", "Netflix", "$15.99", 3],
        ["Your subscription renews soon", "Adobe", "$54.99", 10],
        ["Invoice for October", "Spotify", "$10.99", 12],
        ["Receipt from Apple", "Apple", "$2.99", 20]
      ].map(([subj, from, amt, d], i) =>
        [
          `<rect x="80" y="${250 + i * 90}" width="1040" height="74" rx="10" fill="${P.card}" stroke="${P.rule}"/>`,
          `<rect x="104" y="${274 + i * 90}" width="26" height="26" rx="6" fill="${P.green}"/>`,
          tick(109, 287 + i * 90, P.paper),
          text(150, 290 + i * 90, String(from), { size: 20, weight: 700 }),
          text(300, 290 + i * 90, String(subj), { size: 20, fill: P.ink2 }),
          text(1000, 290 + i * 90, String(amt), { size: 20, weight: 600, mono: true, anchor: "end" }),
          text(1096, 290 + i * 90, `${d}d`, { size: 14, mono: true, fill: P.ink3, anchor: "end" })
        ].join("")
      ),
      text(80, 650, "Each hit gives four things: the name, the amount, the date, and the cycle.", { size: 22, fill: P.ink2 })
    ].join("")),

  // Hero: a trial on a calendar, the conversion day marked.
  "trial-calendar": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "A free trial, on the calendar"),
      ...Array.from({ length: 28 }, (_, i) => {
        const c = i % 7, r = Math.floor(i / 7);
        const x = 80 + c * 148, y = 130 + r * 112;
        const trial = i >= 3 && i < 17, end = i === 17, remind = [10, 14, 17].includes(i);
        return (
          `<rect x="${x}" y="${y}" width="136" height="100" rx="10" fill="${end ? P.alert : trial ? "#e6f7ee" : P.card}" stroke="${P.ruleStrong}"/>` +
          text(x + 14, y + 30, String(i + 1), { size: 18, weight: 600, mono: true, fill: end ? P.paper : P.ink3 }) +
          (i === 3 ? text(x + 14, y + 72, "Trial starts", { size: 16, weight: 600, fill: P.greenText }) : "") +
          (end ? text(x + 14, y + 72, "It charges", { size: 16, weight: 700, fill: P.paper }) : "") +
          (remind && !end ? `<circle cx="${x + 112}" cy="${y + 72}" r="9" fill="${P.green}"/>` + tick(x + 105, y + 73, P.paper) : "") +
          (end ? `<circle cx="${x + 112}" cy="${y + 72}" r="9" fill="${P.paper}"/>` + tick(x + 105, y + 73, P.alert) : "")
        );
      }),
      text(80, 620, "Seven days out, three days out, and the morning of.", { size: 26, weight: 600, fill: P.ink2 })
    ].join("")),

  // Figure: who bills you decides where you cancel.
  "trial-timeline": () =>
    paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, "Who bills you decides where you cancel"),
      card(80, 130, 500, 480, [
        text(110, 180, "Billed by the service", { size: 26, weight: 700 }),
        text(110, 222, "The receipt names the service.", { size: 20, fill: P.ink2 }),
        text(110, 300, "Cancel at:", { size: 16, mono: true, fill: P.ink3, spacing: 1.5 }),
        text(110, 340, "the service's own account page", { size: 22, weight: 600 }),
        text(110, 420, "Deleting the app:", { size: 16, mono: true, fill: P.ink3, spacing: 1.5 }),
        text(110, 460, "changes nothing", { size: 22, weight: 600, fill: P.alert }),
        row(110, 560, 440, "Example receipt from", "Netflix")
      ].join("")),
      card(620, 130, 500, 480, [
        text(650, 180, "Billed by Apple or Google", { size: 26, weight: 700 }),
        text(650, 222, "The receipt says Apple or Google.", { size: 20, fill: P.ink2 }),
        text(650, 300, "Cancel at:", { size: 16, mono: true, fill: P.ink3, spacing: 1.5 }),
        text(650, 340, "Settings → Subscriptions (the store)", { size: 22, weight: 600 }),
        text(650, 420, "The service's website:", { size: 16, mono: true, fill: P.ink3, spacing: 1.5 }),
        text(650, 460, "cannot touch it", { size: 22, weight: 600, fill: P.alert }),
        row(650, 560, 440, "Example receipt from", "Apple")
      ].join("")),
      text(80, 660, "Write down which one it is on the day you sign up.", { size: 22, fill: P.ink2 })
    ].join("")),

  // Hero: the cancel button, hidden behind offers.
  "cancel-maze": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "The path to the cancel button"),
      ...[
        ["Account", P.card, P.ink],
        ["Manage plan", P.card, P.ink],
        ["50% off for 3 months?", "#fdecee", P.alert],
        ["Pause instead?", "#fdecee", P.alert],
        ["Are you sure?", "#fdecee", P.alert],
        ["Cancel membership", "#e6f7ee", P.greenText]
      ].map(([label, fill, color], i) => {
        const x = 80 + (i % 3) * 360, y = 140 + Math.floor(i / 3) * 220;
        const last = i === 5;
        return (
          `<rect x="${x}" y="${y}" width="320" height="140" rx="14" fill="${fill}" stroke="${last ? P.green : P.ruleStrong}" stroke-width="${last ? 3 : 1}"/>` +
          text(x + 24, y + 60, String(label), { size: 24, weight: 700, fill: String(color) }) +
          text(x + 24, y + 104, i >= 2 && !last ? "DECLINE" : last ? "VERIFY AT RENEWAL" : "TAP", { size: 13, mono: true, fill: P.ink3, spacing: 2 }) +
          (i < 5 ? `<path d="M${x + 320} ${y + 70} h 24" stroke="${P.ink3}" stroke-width="2" stroke-dasharray="2 5"/>` : "")
        );
      }),
      text(80, 620, "Every box after the second is there to stop you. Decline each one.", { size: 26, weight: 600, fill: P.ink2 })
    ].join("")),

  // Figure: the catalogue's difficulty counts, computed.
  "difficulty-bars": () => {
    const max = Math.max(...Object.values(STATS.difficulty));
    return paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, `How ${STATS.total} services rate, from Zeno's catalogue`),
      ...DIFF_ORDER.map((k, i) => {
        const n = STATS.difficulty[k];
        const y = 150 + i * 120, w = Math.max(8, Math.round((n / max) * 660));
        return (
          text(80, y + 44, DIFF_LABEL[k], { size: 26, weight: 700 }) +
          `<rect x="300" y="${y + 14}" width="${w}" height="44" rx="6" fill="${DIFF_COLOR[k]}"/>` +
          text(300 + w + 20, y + 44, String(n), { size: 26, weight: 700, mono: true }) +
          text(300 + w + 20 + String(n).length * 16 + 10, y + 44, `· ${Math.round((n / STATS.total) * 100)}%`, { size: 20, mono: true, fill: P.ink3 })
        );
      }),
      text(80, 650, "Counted when this picture was drawn; the post's figures come from the same catalogue.", { size: 20, fill: P.ink2 })
    ].join(""));
  },

  // Hero: the audit as a clock face.
  "audit-clock": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "Twenty minutes, four parts"),
      `<circle cx="330" cy="380" r="210" fill="${P.card}" stroke="${P.ruleStrong}" stroke-width="3"/>`,
      ...[[0, 10, P.info, "List"], [10, 14, P.green, "Price"], [14, 17, P.warn, "Ask"], [17, 20, P.alert, "Cancel"]].map(([a, b, color]) => {
        const toXY = (m: number, r: number) => {
          const t = ((Number(m) / 20) * 2 * Math.PI) - Math.PI / 2;
          return [330 + r * Math.cos(t), 380 + r * Math.sin(t)] as const;
        };
        const [x1, y1] = toXY(Number(a), 190), [x2, y2] = toXY(Number(b), 190);
        const large = Number(b) - Number(a) > 10 ? 1 : 0;
        return `<path d="M330 380 L${x1} ${y1} A190 190 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" fill-opacity="0.85"/>`;
      }),
      `<circle cx="330" cy="380" r="70" fill="${P.card}"/>`,
      text(330, 392, "20 min", { size: 30, weight: 700, mono: true, anchor: "middle" }),
      ...[["0 to 10", "Build the list", P.info], ["10 to 14", "Price everything per year", P.green], ["14 to 17", "One question per line", P.warn], ["17 to 20", "Cancel, set the reminders", P.alert]].map(([t, l, c], i) =>
        `<rect x="640" y="${184 + i * 100}" width="18" height="18" rx="4" fill="${c}"/>` + text(676, 200 + i * 100, String(t), { size: 16, mono: true, fill: P.ink3, spacing: 1.5 }) + text(676, 236 + i * 100, String(l), { size: 26, weight: 700 })
      )
    ].join("")),

  // Figure: the audit sheet, with the per-year column.
  "audit-sheet": () =>
    paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, "The sheet, after minute 14"),
      card(80, 120, 1040, 500, [
        text(110, 170, "SERVICE", { size: 13, mono: true, fill: P.ink3, spacing: 2 }),
        text(560, 170, "PER MONTH", { size: 13, mono: true, fill: P.ink3, spacing: 2, anchor: "end" }),
        text(760, 170, "PER YEAR", { size: 13, mono: true, fill: P.ink3, spacing: 2, anchor: "end" }),
        text(1090, 170, "LAST USED", { size: 13, mono: true, fill: P.ink3, spacing: 2, anchor: "end" }),
        `<line x1="110" y1="186" x2="1090" y2="186" stroke="${P.ruleStrong}"/>`,
        ...[
          ["Netflix", "15.99", "191.88", "yesterday", false],
          ["Adobe CC", "54.99", "659.88", "5 months ago", true],
          ["Spotify", "10.99", "131.88", "today", false],
          ["Language app", "12.99", "155.88", "8 months ago", true],
          ["iCloud+", "2.99", "35.88", "always on", false],
          ["Fitness app", "9.99", "119.88", "4 months ago", true]
        ].map(([n, m, y, u, mark], i) => {
          const yy = 232 + i * 56;
          return (
            text(110, yy, String(n), { size: 22, weight: 600, fill: mark ? P.alert : P.ink }) +
            text(560, yy, String(m), { size: 22, mono: true, anchor: "end" }) +
            text(760, yy, String(y), { size: 22, weight: 700, mono: true, anchor: "end" }) +
            text(1090, yy, String(u), { size: 20, fill: mark ? P.alert : P.ink2, anchor: "end" }) +
            (mark ? `<rect x="84" y="${yy - 20}" width="6" height="28" fill="${P.alert}"/>` : "")
          );
        }),
        `<line x1="110" y1="580" x2="1090" y2="580" stroke="${P.ruleStrong}"/>`,
        text(110, 612, "Marked: three lines, $935.64 a year", { size: 22, weight: 700, fill: P.alert }),
        text(1090, 612, "1,295.28", { size: 22, weight: 700, mono: true, anchor: "end" })
      ].join("")),
      text(80, 665, "The per-year column is the moment the audit starts to feel worth doing.", { size: 22, fill: P.ink2 })
    ].join("")),

  // Hero: the hardest services, as stamps.
  "hardest-to-cancel": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "Rated hard, or worse, in the catalogue"),
      ...services
        .filter((s) => s.cancelDifficulty === "dark_pattern" || s.cancelDifficulty === "hard")
        .sort((a, b) => (a.cancelDifficulty === "dark_pattern" ? -1 : 1) - (b.cancelDifficulty === "dark_pattern" ? -1 : 1) || a.name.localeCompare(b.name))
        .slice(0, 14)
        .map((s, i) => {
          const x = 80 + (i % 2) * 540, y = 130 + Math.floor(i / 2) * 68;
          const dark = s.cancelDifficulty === "dark_pattern";
          return (
            `<rect x="${x}" y="${y}" width="500" height="54" rx="8" fill="${P.card}" stroke="${P.rule}"/>` +
            `<rect x="${x + 12}" y="${y + 15}" width="24" height="24" rx="6" fill="${s.logoColor || P.ink3}"/>` +
            text(x + 52, y + 36, s.name, { size: 22, weight: 700 }) +
            text(x + 486, y + 35, dark ? "DARK PATTERN" : "HARD", { size: 13, weight: 700, mono: true, fill: dark ? P.alert : P.warn, anchor: "end", spacing: 1.5 })
          );
        }),
      text(80, 640, `${STATS.difficulty.dark_pattern + STATS.difficulty.hard} of ${STATS.total}. The rest are easy or medium.`, { size: 24, weight: 600, fill: P.ink2 })
    ].join("")),

  // Figure: the steps a dark-pattern guide walks, quoted from the catalogue.
  "dark-pattern-steps": () => {
    const adobe = services.find((s) => s.slug === "adobe-creative-cloud") ?? services.find((s) => s.cancelDifficulty === "dark_pattern")!;
    return paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, `Cancelling ${adobe.name}, step by step, from the guide`),
      ...adobe.cancelGuide.slice(0, 6).map((step, i) =>
        `<circle cx="104" cy="${150 + i * 80}" r="18" fill="${P.ink}"/>` +
        text(104, 157 + i * 80, String(i + 1), { size: 18, weight: 700, mono: true, fill: P.paper, anchor: "middle" }) +
        text(140, 158 + i * 80, step.length > 78 ? step.slice(0, 76) + "…" : step, { size: 22, fill: /offer|discount|decline/i.test(step) ? P.alert : P.ink })
      ),
      text(80, 660, "Red: a step whose job is to make you stay. Decline it.", { size: 22, fill: P.ink2 })
    ].join(""));
  },

  // Hero: prices on a shelf.
  "price-shelf": () => {
    const picks = [0.99, 2.99, 4.99, 9.99, 14.99, 22.99, 54.99, 150];
    return paper(HERO.w, HERO.h, [
      kicker(80, 90, "What a month costs, across the catalogue"),
      `<line x1="80" y1="520" x2="1120" y2="520" stroke="${P.ink}" stroke-width="3"/>`,
      ...picks.map((p, i) => {
        const h = 40 + Math.log(p + 1) * 86, x = 90 + i * 130;
        return `<rect x="${x}" y="${520 - h}" width="100" height="${h}" rx="8" fill="${p >= 50 ? P.alert : p >= 10 ? P.info : P.verified}" fill-opacity="0.9"/>` + text(x + 50, 560, `$${p}`, { size: 18, weight: 600, mono: true, anchor: "middle" });
      }),
      text(80, 630, `Median $${STATS.prices[Math.floor(STATS.prices.length / 2)]} a month. Half the catalogue costs that or less.`, { size: 26, weight: 600, fill: P.ink2 })
    ].join(""));
  },

  // Figure: the price histogram, computed.
  "price-histogram": () => {
    const buckets: [string, (p: number) => boolean][] = [
      ["under $5", (p) => p < 5],
      ["$5 to $9.99", (p) => p >= 5 && p < 10],
      ["$10 to $14.99", (p) => p >= 10 && p < 15],
      ["$15 to $19.99", (p) => p >= 15 && p < 20],
      ["$20 to $49.99", (p) => p >= 20 && p < 50],
      ["$50 and over", (p) => p >= 50]
    ];
    const counts = buckets.map(([, f]) => STATS.prices.filter(f).length);
    const max = Math.max(...counts);
    return paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, `Monthly prices of ${STATS.prices.length} services with a listed price`),
      ...buckets.map(([label], i) => {
        const y = 140 + i * 82, w = Math.max(8, Math.round((counts[i]! / max) * 700));
        return text(80, y + 34, label, { size: 22, weight: 600 }) + `<rect x="330" y="${y + 6}" width="${w}" height="40" rx="6" fill="${P.info}" fill-opacity="${0.55 + i * 0.08}"/>` + text(330 + w + 16, y + 34, String(counts[i]), { size: 22, weight: 700, mono: true });
      }),
      text(80, 660, `Median $${STATS.prices[Math.floor(STATS.prices.length / 2)]}, mean $${(STATS.prices.reduce((a, b) => a + b, 0) / STATS.prices.length).toFixed(2)}, from $${STATS.prices[0]} to $${STATS.prices.at(-1)}.`, { size: 22, fill: P.ink2 })
    ].join(""));
  },

  // Hero: categories as a map of tiles.
  "categories-map": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "Eleven categories, one catalogue"),
      ...STATS.categories.map((c, i) => {
        const n = services.filter((s) => s.category === c).length;
        const x = 80 + (i % 4) * 262, y = 130 + Math.floor(i / 4) * 150;
        return `<rect x="${x}" y="${y}" width="240" height="128" rx="12" fill="${P.card}" stroke="${P.ruleStrong}"/>` + text(x + 20, y + 44, c.replace("_", " "), { size: 20, weight: 700 }) + text(x + 20, y + 100, String(n), { size: 40, weight: 700, mono: true, fill: P.info });
      }),
      text(80, 630, `${STATS.total} services. The number is the count in each category.`, { size: 24, weight: 600, fill: P.ink2 })
    ].join("")),

  // Figure: difficulty by category, stacked and computed.
  "category-stacked": () => {
    const rows = STATS.categories
      .map((c) => ({ c, counts: DIFF_ORDER.map((d) => services.filter((s) => s.category === c && s.cancelDifficulty === d).length) }))
      .sort((a, b) => b.counts.reduce((x, y) => x + y, 0) - a.counts.reduce((x, y) => x + y, 0));
    const max = Math.max(...rows.map((r) => r.counts.reduce((x, y) => x + y, 0)));
    return paper(FIGURE.w, FIGURE.h, [
      kicker(80, 80, "Easy, medium, hard and dark pattern, by category"),
      ...rows.map((r, i) => {
        const y = 110 + i * 46;
        let x = 300;
        const bars = r.counts
          .map((n, j) => {
            const w = Math.round((n / max) * 700);
            const s = `<rect x="${x}" y="${y}" width="${w}" height="30" fill="${DIFF_COLOR[DIFF_ORDER[j]!]}"/>`;
            x += w;
            return n ? s : "";
          })
          .join("");
        return text(80, y + 22, r.c.replace("_", " "), { size: 20, weight: 600 }) + bars + text(x + 12, y + 22, String(r.counts.reduce((a, b) => a + b, 0)), { size: 18, mono: true, fill: P.ink3 });
      }),
      ...DIFF_ORDER.map((d, j) => `<rect x="${80 + j * 240}" y="640" width="18" height="18" rx="4" fill="${DIFF_COLOR[d]}"/>` + text(108 + j * 240, 656, DIFF_LABEL[d], { size: 18, fill: P.ink2 }))
    ].join(""));
  },

  // Hero: store or website, a decision in two branches.
  "store-or-website": () =>
    paper(HERO.w, HERO.h, [
      kicker(80, 90, "Where do you cancel it?"),
      `<rect x="400" y="130" width="400" height="90" rx="14" fill="${P.ink}"/>`,
      text(600, 185, "Who sent the receipt?", { size: 26, weight: 700, fill: P.paper, anchor: "middle" }),
      `<path d="M600 220 v40 M600 260 h-320 v40 M600 260 h320 v40" fill="none" stroke="${P.ink3}" stroke-width="2.5"/>`,
      `<rect x="80" y="300" width="400" height="230" rx="14" fill="${P.card}" stroke="${P.ruleStrong}"/>`,
      text(110, 350, "The service itself", { size: 26, weight: 700 }),
      text(110, 400, "Cancel on its website, in your account.", { size: 20, fill: P.ink2 }),
      text(110, 436, "Keep the confirmation email.", { size: 20, fill: P.ink2 }),
      text(110, 500, "WEBSITE", { size: 14, weight: 700, mono: true, fill: P.greenText, spacing: 2 }),
      `<rect x="720" y="300" width="400" height="230" rx="14" fill="${P.card}" stroke="${P.ruleStrong}"/>`,
      text(750, 350, "Apple or Google", { size: 26, weight: 700 }),
      text(750, 400, "Cancel in the store's subscriptions screen.", { size: 20, fill: P.ink2 }),
      text(750, 436, "The website cannot reach it.", { size: 20, fill: P.ink2 }),
      text(750, 500, "APP STORE · GOOGLE PLAY", { size: 14, weight: 700, mono: true, fill: P.greenText, spacing: 2 }),
      text(80, 620, "Deleting the app does neither.", { size: 26, weight: 600, fill: P.alert })
    ].join("")),

  // Figure: the two subscription screens, side by side.
  "billing-decision": () =>
    paper(FIGURE.w, FIGURE.h, [
      kicker(80, 90, "The two screens that actually stop a store-billed charge"),
      ...[
        ["iPhone", ["Settings", "Your name", "Subscriptions", "The app → Cancel"]],
        ["Android", ["Play Store", "Profile picture", "Payments & subscriptions", "Subscriptions → Cancel"]]
      ].map(([title, steps], k) => {
        const x = 80 + k * 540;
        return (
          `<rect x="${x}" y="130" width="500" height="480" rx="28" fill="${P.desk}" stroke="${P.ruleStrong}" stroke-width="2"/>` +
          text(x + 30, 185, String(title), { size: 26, weight: 700 }) +
          (steps as string[])
            .map((s, i) => `<rect x="${x + 30}" y="${210 + i * 90}" width="440" height="68" rx="10" fill="${P.card}" stroke="${P.rule}"/>` + text(x + 54, 253 + i * 90, `${i + 1}.  ${s}`, { size: 22, weight: i === 3 ? 700 : 500, fill: i === 3 ? P.alert : P.ink }))
            .join("")
        );
      }),
      text(80, 660, "Written from the app stores' own screens; the names can shift slightly between versions.", { size: 20, fill: P.ink2 })
    ].join(""))
};

// ── Share cards ─────────────────────────────────────────────────────────
function ogCard(eyebrow: string, title: string): string {
  const lines = wrap(title, 30).slice(0, 3);
  const size = lines.length > 2 ? 56 : 64;
  return paper(OG.w, OG.h, [
    `<rect x="0" y="0" width="${OG.w}" height="8" fill="${P.green}"/>`,
    text(80, 120, "zeno", { size: 44, weight: 800, spacing: -1 }),
    kicker(80, 190, eyebrow),
    ...lines.map((l, i) => text(80, 270 + i * (size + 14), l, { size, weight: 700, spacing: -1.2 })),
    `<line x1="80" y1="540" x2="1120" y2="540" stroke="${P.ruleStrong}"/>`,
    text(80, 582, "NO BANK LOGIN REQUIRED", { size: 16, weight: 700, mono: true, fill: P.greenText, spacing: 3 }),
    text(1120, 582, SITE_HOST, { size: 18, mono: true, fill: P.ink3, anchor: "end" })
  ].join(""), { baselines: false });
}

// ── Render ──────────────────────────────────────────────────────────────
async function main() {
  mkdirSync(ART_DIR, { recursive: true });
  mkdirSync(OG_DIR, { recursive: true });
  let n = 0;
  for (const [name, draw] of Object.entries(drawings)) {
    const svg = Buffer.from(draw());
    writeFileSync(join(ART_DIR, `${name}.svg`), svg);
    await sharp(svg).webp({ quality: 82 }).toFile(join(ART_DIR, `${name}.webp`));
    await sharp(svg).resize({ width: 600 }).webp({ quality: 80 }).toFile(join(ART_DIR, `${name}-600.webp`));
    n++;
  }
  const cards: [string, string, string][] = [
    ...Object.entries(OG_PAGES).map(([path, p]) => [ogSlug(path), p.eyebrow, p.title] as [string, string, string]),
    ...POSTS.map((post) => [ogSlug(`/blog/${post.slug}`), "The Zeno blog", fillFigures(post.title)] as [string, string, string])
  ];
  for (const [slug, eyebrow, title] of cards) {
    await sharp(Buffer.from(ogCard(eyebrow, title))).png({ compressionLevel: 9, palette: true }).toFile(join(OG_DIR, `${slug}.png`));
    n++;
  }
  console.log(`site-art: ${Object.keys(drawings).length} drawings (×2 sizes) and ${cards.length} share cards written; ${n} items`);
}

export const DRAWINGS = Object.keys(drawings);

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().catch((e) => { console.error(e); process.exit(1); });
