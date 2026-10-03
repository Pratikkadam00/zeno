import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { governedInlineScripts, hashSource, run, withScriptCsp } from "./csp-script-hashes.mjs";

const sha = (text: string) => `'sha256-${createHash("sha256").update(text, "utf8").digest("base64")}'`;
const page = (body: string, head = "<head>") => `<!DOCTYPE html><html lang="en">${head}<title>t</title></head><body>${body}</body></html>`;
const policyOf = (html: string) => /<meta data-zeno-csp http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)?.[1];

describe("governedInlineScripts", () => {
  it("takes inline classic and module scripts, import maps and speculation rules", () => {
    const html = page(
      `<script>a()</script><script type="module">b()</script><script type="text/javascript">c()</script>` +
        `<script type="importmap">{}</script><script type="speculationrules">{"prefetch":[]}</script>`
    );
    expect(governedInlineScripts(html)).toEqual(["a()", "b()", "c()", "{}", '{"prefetch":[]}']);
  });

  it("skips scripts loaded from a file, and data blocks (JSON-LD), which never run", () => {
    const html = page(`<script src="/_next/a.js" async=""></script><script type="application/ld+json">{"@type":"Thing"}</script><script async src="/b.js"></script><script>run()</script>`);
    expect(governedInlineScripts(html)).toEqual(["run()"]);
  });

  it("ends a script where HTML does: </script then whitespace, / or >, whatever follows", () => {
    const html = page(`<script>a()</script\t\n bar><script>b()</SCRIPT ><script>c()</script/><script>d()</script>`);
    expect(governedInlineScripts(html)).toEqual(["a()", "b()", "c()", "d()"]);
    // "</scripts>" is not an end tag: the script runs on past it.
    expect(governedInlineScripts(page(`<script>x = "</scripts>"; y()</script>`))).toEqual([`x = "</scripts>"; y()`]);
  });

  it("reads type case-insensitively, quoted or not", () => {
    expect(governedInlineScripts(page(`<script TYPE=MODULE>m()</script><script type='Application/LD+JSON'>{}</script>`))).toEqual(["m()"]);
  });
});

describe("hashSource", () => {
  it("is the CSP sha256 source of the text", () => {
    expect(hashSource("alert(1)")).toBe(sha("alert(1)"));
  });

  it("hashes what the browser sees: CRLF and lone CR are LF after HTML parsing", () => {
    expect(hashSource("a()\r\nb()\rc()")).toBe(sha("a()\nb()\nc()"));
  });
});

describe("withScriptCsp", () => {
  it("puts a policy naming each inline script's hash first in <head>, before anything else", () => {
    const { html, hashes } = withScriptCsp(page(`<script>one()</script><script src="/x.js"></script><script>two()</script>`));
    expect(hashes).toBe(2);
    expect(html).toContain(`<html lang="en"><head><meta data-zeno-csp `);
    expect(policyOf(html)).toBe(`script-src 'self' ${sha("one()")} ${sha("two()")}`);
  });

  it("lists a script that appears twice once", () => {
    const { html, hashes } = withScriptCsp(page(`<script>same()</script><script>same()</script>`));
    expect(hashes).toBe(1);
    expect(policyOf(html)).toBe(`script-src 'self' ${sha("same()")}`);
  });

  it("works with a <head> that has attributes", () => {
    const { html } = withScriptCsp(page(`<script>x()</script>`, `<head data-x="1">`));
    expect(html).toContain(`<head data-x="1"><meta data-zeno-csp `);
  });

  it("a page with no inline script allows only same-origin files", () => {
    expect(policyOf(withScriptCsp(page("<p>hi</p>")).html)).toBe("script-src 'self' ");
  });

  it("running it again changes nothing (one policy, same hashes)", () => {
    const once = withScriptCsp(page(`<script>x()</script>`)).html;
    const twice = withScriptCsp(once).html;
    expect(twice).toBe(once);
    expect(twice.match(/data-zeno-csp/g)).toHaveLength(1);
  });

  it("refuses a page without <head>, or with a script before it (a policy governs only what follows it)", () => {
    expect(() => withScriptCsp("<html><body><script>x()</script></body></html>")).toThrow(/no <head>/);
    expect(() => withScriptCsp(`<html><script>early()</script><head></head></html>`)).toThrow(/before <head>/);
  });
});

describe("run", () => {
  let dir = "";
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = "";
  });

  it("writes the policy into every .html under the folder, nested too, and leaves other files alone", () => {
    dir = mkdtempSync(join(tmpdir(), "csp-"));
    mkdirSync(join(dir, "cancel"));
    writeFileSync(join(dir, "index.html"), page(`<script>home()</script>`));
    writeFileSync(join(dir, "cancel", "netflix.html"), page(`<script>guide()</script><script>more()</script>`));
    writeFileSync(join(dir, "index.rsc"), "<script>not-html()</script>");
    expect(run(dir)).toEqual({ pages: 2, hashes: 3 });
    expect(policyOf(readFileSync(join(dir, "cancel", "netflix.html"), "utf8"))).toBe(`script-src 'self' ${sha("guide()")} ${sha("more()")}`);
    expect(readFileSync(join(dir, "index.rsc"), "utf8")).toBe("<script>not-html()</script>");
  });

  it("fails when there are no pages (the build didn't run)", () => {
    dir = mkdtempSync(join(tmpdir(), "csp-"));
    expect(() => run(dir)).toThrow(/no prerendered pages/);
  });
});

it("the website's build runs it after next build, so every deploy gets it", () => {
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "apps", "web", "package.json"), "utf8"));
  expect(pkg.scripts.build).toMatch(/&& next build && node \.\.\/\.\.\/scripts\/csp-script-hashes\.mjs$/);
});
