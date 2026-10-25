// The last layer between the model and the person (F247). The charter tells
// the coach what it may say; the JSON schema fixes the shape; this checks what
// actually came back, so an answer that slipped past both still never reaches
// the screen. It is deliberately blunt: anything that looks like code, a link,
// markup, or the coach's own instructions turns the WHOLE answer into a fixed
// redirect written here, not by the model.
//
// Blunt has a price, false positives, and the patterns are chosen to avoid
// ordinary coaching sentences ("Import your statement", "Cancel Netflix; keep
// Spotify", "switch to annual: $9.99/mo"). coach-guard.test.ts pins both sides.

export const COACH_REDIRECT =
  "I can only help with your subscriptions and what they cost. Ask me which ones to cancel, which to switch to annual billing, or where two of them overlap.";

/** Longest each field may be; longer is cut at a word boundary. */
export const FIELD_LIMITS = { summary: 400, title: 90, detail: 400, label: 40 } as const;

const CODE_PATTERNS: RegExp[] = [
  /```|~~~/, // fenced blocks
  /^\s*(def|class)\s+\w+\s*[(:]/m, // Python
  /^\s*(import\s+[\w{*]|from\s+[\w.]+\s+import\b)/m, // imports (lower case: "Import your CSV" is fine)
  /\b(function\s*\w*\s*\(|console\.\w+\(|System\.out|printf?\s*\()/, // JS/Java/C/Python calls
  /=>\s*[{(]/, // arrow functions; no \b, which would miss "(a)=>(" (found by the mutation run)
  /\b(const|let|var)\s+\w+\s*=/, // declarations ("let your trial run out" has no "=")
  /\b(SELECT\s+[\w*,\s]+\s+FROM|INSERT\s+INTO|DROP\s+TABLE|UPDATE\s+\w+\s+SET)\b/, // SQL (upper case)
  /(^|\s)(sudo|chmod|rm\s+-rf|curl\s+-\w|wget\s|pip3?\s+install|npm\s+(i|install)\s)/m, // shell
  /\{[^{}\n]*;[^{}\n]*\}/, // a braced block with statements
  /#include\s*</,
  // Shell and REPL prompts, shebangs. "$ ls" is a prompt; "$15.49/mo" is a price.
  /^\s*(\$\s+[a-z]|>>>\s|#!\/)/m
];

const LINK_OR_MARKUP: RegExp[] = [
  /\bhttps?:\/\/|\bwww\.\w/i,
  /<\/?[a-z][a-z0-9-]*(\s[^<>]*)?>/i, // HTML-ish tags
  /\[[^\]]+\]\([^)]+\)/ // markdown links
];

// A bare domain ("evil.com", "evil.com/login"). Kept apart from the patterns
// above because it is the one a person's own subscription name may excuse.
const BARE_DOMAIN = /\b[a-z0-9-]+\.(com|net|org|io|app|in|co|ai|dev|tv|xyz|ru|info)(\/\S*)?\b/gi;

// Words only the charter and its wrapping use. An answer quoting them is
// reciting its instructions (U7.14).
const CHARTER_LEAK: RegExp[] = [/constitution/i, /operating charter/i, /output contract/i, /anti-jailbreak/i, /non-negotiable/i, /system prompt/i, /user_data/i];

export type GuardVerdict = "clean" | "code" | "link" | "leak";

/**
 * What a piece of text is, if it is not plain prose. `subscriptionNames`
 * excuses a bare domain only when one of the person's own names contains it:
 * sixteen catalogue services are named like domains (Copy.ai, Chess.com
 * Premium, MLB.TV) and the coach must be able to name them. A name excuses
 * nothing else. The first version deleted the names from the text before
 * screening, so a subscription called "e" or "." would have erased every e or
 * dot, and "def" or "evil.com" with it (found by the mutation run, 2026-10-25).
 */
// Stryker disable next-line ArrayDeclaration: equivalent; a default name only matters if the text contains it
export function screenText(text: string, subscriptionNames: readonly string[] = []): GuardVerdict {
  if (CODE_PATTERNS.some((pattern) => pattern.test(text))) return "code";
  if (LINK_OR_MARKUP.some((pattern) => pattern.test(text))) return "link";
  const names = subscriptionNames.map((name) => name.toLowerCase());
  for (const [domain] of text.matchAll(BARE_DOMAIN)) {
    if (!names.some((name) => name.includes(domain.toLowerCase()))) return "link";
  }
  if (CHARTER_LEAK.some((pattern) => pattern.test(text))) return "leak";
  return "clean";
}

/** Cut to `limit` characters at a word boundary, with an ellipsis when cut. */
export function clip(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export type GuardedRecommendation = { title: string; detail: string; estimatedMonthlySavingsLabel?: string };
export type GuardedAnswer = { outOfScope: boolean; summary: string; recommendations: GuardedRecommendation[] };

/**
 * Screen every field of an answer. One bad field replaces the whole answer:
 * a reply that is half code is not one to show half of.
 */
// Stryker disable next-line ArrayDeclaration: equivalent; as for screenText
export function guardAnswer(answer: GuardedAnswer, subscriptionNames: readonly string[] = []): { answer: GuardedAnswer; verdict: GuardVerdict } {
  const fields = [answer.summary, ...answer.recommendations.flatMap((r) => (r.estimatedMonthlySavingsLabel === undefined ? [r.title, r.detail] : [r.title, r.detail, r.estimatedMonthlySavingsLabel]))];
  for (const field of fields) {
    const verdict = screenText(field, subscriptionNames);
    if (verdict !== "clean") return { answer: { outOfScope: true, summary: COACH_REDIRECT, recommendations: [] }, verdict };
  }
  const summary = clip(answer.summary, FIELD_LIMITS.summary);
  return {
    verdict: "clean",
    answer: {
      outOfScope: answer.outOfScope,
      // An out-of-scope answer with nothing to say gets the fixed redirect.
      summary: answer.outOfScope && summary === "" ? COACH_REDIRECT : summary,
      recommendations: answer.outOfScope
        ? []
        : answer.recommendations.slice(0, 5).map((r) => {
            const label = r.estimatedMonthlySavingsLabel ? clip(r.estimatedMonthlySavingsLabel, FIELD_LIMITS.label) : "";
            return label
              ? { title: clip(r.title, FIELD_LIMITS.title), detail: clip(r.detail, FIELD_LIMITS.detail), estimatedMonthlySavingsLabel: label }
              : { title: clip(r.title, FIELD_LIMITS.title), detail: clip(r.detail, FIELD_LIMITS.detail) };
          })
    }
  };
}
