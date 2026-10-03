#!/usr/bin/env node
// P4.3: the website's inline scripts, allowed by hash instead of 'unsafe-inline'.
//
// Every page carries three inline scripts: Next's bootstrap, our theme script
// (lib/theme.ts) and the page's own React Server Components payload, which
// differs on every page. A header is one policy for all pages, so it can't list
// them; nonces would force every page to render per request (Next's CSP guide),
// and Next's experimental SRI leaves these inline scripts blocked (measured,
// HARDENING_LOG P4.3). So after `next build`, this writes into each prerendered
// page a <meta> CSP naming the hashes of that page's own scripts.
//
// A browser enforces every policy it is given: the header (which keeps
// 'unsafe-inline' and everything a <meta> can't carry, e.g. frame-ancestors)
// AND this one. An inline script runs only if both allow it, so only the
// page's own scripts run. If this step were skipped, the header alone applies:
// the site still works, at the old posture. Re-running it is safe.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MARKER = "data-zeno-csp";

// <script type> values a browser executes, or that script-src governs anyway
// (import maps, speculation rules). Any other type (application/ld+json) is a
// data block: never run, not subject to CSP.
const GOVERNED_TYPES = new Set([
  "",
  "module",
  "importmap",
  "speculationrules",
  "text/javascript",
  "application/javascript",
  "application/ecmascript",
  "text/ecmascript"
]);

// An end tag is "</script" then whitespace, "/" or ">", and anything up to ">"
// (HTML's tokenizer; CodeQL js/bad-tag-filter).
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script(?=[\s/>])[^>]*>/gi;

/** The text of every inline script the page's script-src governs, in order. Exported for tests. */
export function governedInlineScripts(html) {
  const out = [];
  for (const [, attrs, body] of html.matchAll(SCRIPT)) {
    if (/\ssrc\s*=/i.test(` ${attrs}`)) continue;
    const type = /\stype\s*=\s*["']?([^"'\s>]*)/i.exec(` ${attrs}`)?.[1]?.trim().toLowerCase() ?? "";
    if (!GOVERNED_TYPES.has(type)) continue;
    out.push(body);
  }
  return out;
}

/**
 * The CSP source for a script's text. The browser hashes the text after the
 * HTML parser has normalised line endings (CRLF and lone CR become LF), so the
 * same is done here. Exported for tests.
 */
export function hashSource(text) {
  const normalised = text.replace(/\r\n?/g, "\n");
  return `'sha256-${createHash("sha256").update(normalised, "utf8").digest("base64")}'`;
}

/** The page's HTML with its script <meta> CSP as the first thing in <head>. Exported for tests. */
export function withScriptCsp(html) {
  const cleaned = html.replace(new RegExp(`<meta ${MARKER}[^>]*>`, "g"), "");
  const head = /<head(\s[^>]*)?>/i.exec(cleaned);
  if (!head) throw new Error("no <head> to put the policy in");
  const at = head.index + head[0].length;
  // A policy only governs what the parser meets after it.
  if (/<script\b/i.test(cleaned.slice(0, at))) throw new Error("a script comes before <head>");
  const unique = [...new Set(governedInlineScripts(cleaned).map(hashSource))];
  const meta = `<meta ${MARKER} http-equiv="Content-Security-Policy" content="script-src 'self' ${unique.join(" ")}">`;
  return { html: cleaned.slice(0, at) + meta + cleaned.slice(at), hashes: unique.length };
}

/** Every .html file under `dir`. */
function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (p.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Write the policy into every prerendered page under `dir`; returns counts. */
export function run(dir) {
  const files = htmlFiles(dir);
  if (files.length === 0) throw new Error(`no prerendered pages under ${dir}: run next build first`);
  let hashes = 0;
  for (const file of files) {
    const result = withScriptCsp(readFileSync(file, "utf8"));
    writeFileSync(file, result.html);
    hashes += result.hashes;
  }
  return { pages: files.length, hashes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = process.argv[2] ?? join(".next", "server", "app");
  try {
    const { pages, hashes } = run(dir);
    console.log(`csp-script-hashes: ${pages} pages, ${hashes} inline scripts allowed by hash`);
  } catch (err) {
    console.error(`csp-script-hashes: ${err.message}`);
    process.exit(1);
  }
}
