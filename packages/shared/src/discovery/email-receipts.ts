// Reading the real app's name out of an App Store / Play Store receipt, used by the
// app's email scanner (apps/mobile/src/discovery/emailScanner.ts), which does the
// rest of the parsing itself. This file once also held a whole receipt detector
// (amount, cycle, category, a confidence score) that nothing called: the app's
// scanner is the one that runs. Mutation testing found its scoring and category
// rules untested; as dead code it was removed instead (P6.1, F206).

// Receipt/biller noise that can precede the real app name in a flattened receipt.
// "store" on its own: the 3-word window before "(Monthly)" can start mid-heading
// ("App Store receipt Netflix (Monthly)" captured "Store receipt Netflix").
// One space after the word: cleanStoreApp folds every gap to a single space first.
const noiseLeadPattern = /^(?:your|the|from|for|receipt|invoice|apple|app\s?store|store|google\s?play|order|item|renewal|auto[- ]?renew(?:able|ing)?)(?:\s|$)/i;
const appWord = "[A-Za-z0-9][\\w+&.\\-]*";
// Words of an app name are separated by spaces/tabs ONLY: with `\s+` a name ran
// across line breaks and swallowed the line above ("App Store receipt\nNetflix
// (Monthly)" → "Store receipt Netflix", which then matched nothing).
const gap = "[ \\t]+";
const optGap = "[ \\t]*";

// A captured name is 1-3 `appWord`s joined by spaces/tabs: it never holds a quote or
// a leading/trailing space, so this only folds the gaps and peels noise words off
// the front until none is left (each peel shortens it, so it ends). Quote stripping
// and a six-peel cap used to be here; neither could ever act (P6.1, F206).
function cleanStoreApp(value: string): string {
  let result = value.replace(/\s+/g, " ");
  let next = result.replace(noiseLeadPattern, "");
  while (next !== result) {
    result = next;
    next = result.replace(noiseLeadPattern, "");
  }
  return result;
}

/** Pull the real app/service name out of an App Store / Play Store receipt — the
 *  biller is Apple/Google, but the subscription is e.g. "Disney+" or "Duolingo". */
export function extractStoreAppName(text: string): string | null {
  // 1) up to 3 words immediately before a "(Monthly)" / "(1 Year)" period marker
  const period = text.match(new RegExp(`(${appWord}(?:${gap}${appWord}){0,2})${optGap}\\((?:1\\s*month|monthly|1\\s*year|annual|yearly|auto[- ]?renewable)\\)`, "i"));
  const fromPeriod = period?.[1] ? cleanStoreApp(period[1]) : "";
  if (fromPeriod.length >= 2) return fromPeriod;
  // 2) 1-2 words right before "subscription"/"membership"
  const before = text.match(new RegExp(`(${appWord}(?:${gap}${appWord}){0,1})${gap}(?:subscription|membership)\\b`, "i"));
  const fromBefore = before?.[1] ? cleanStoreApp(before[1]) : "";
  if (fromBefore.length >= 2) return fromBefore;
  // 3) "receipt for X" / "subscription to X" / "renewal for X"
  const after = text.match(new RegExp(`(?:receipt for|subscription to|renewal for)${gap}(${appWord}(?:${gap}${appWord}){0,2})`, "i"));
  const fromAfter = after?.[1] ? cleanStoreApp(after[1]) : "";
  if (fromAfter.length >= 2) return fromAfter;
  return null;
}
