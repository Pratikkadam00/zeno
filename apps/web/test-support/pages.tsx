// Every page of the website, found on disk and rendered the way the server
// renders it (its layouts around it, async server components awaited), so the
// page tests cover a new page the day it is added.
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// From the file path, not new URL(): under jsdom URL is jsdom's class, which
// Node's fileURLToPath refuses.
const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../app");

/** A page file, as Next sees it: its route and its layouts, root first. */
export type PageFile = { route: string; file: string; dir: string; layouts: string[] };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Route groups "(x)" don't appear in the URL; "[slug]" stays as a placeholder. */
export function listPages(): PageFile[] {
  const files = walk(APP_DIR);
  return files
    .filter((f) => /[\\/]page\.tsx$/.test(f))
    .map((file) => {
      const dir = relative(APP_DIR, file).split(sep).slice(0, -1);
      const route = "/" + dir.filter((seg) => !/^\(.*\)$/.test(seg)).join("/");
      const layouts: string[] = [];
      // From the root layout (i = 0) down to the page's own folder.
      for (let i = 0; i <= dir.length; i += 1) {
        const layout = join(APP_DIR, ...dir.slice(0, i), "layout.tsx");
        if (files.includes(layout)) layouts.push(layout);
      }
      return { route, file, dir: dir.join("/"), layouts };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
}

type PageModule = {
  default: (props: { params: Promise<Record<string, string>> }) => ReactElement | Promise<ReactElement>;
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<Record<string, string>> }) => Promise<Metadata>;
  generateStaticParams?: () => Record<string, string>[];
};
type LayoutModule = { default: (props: { children: ReactNode }) => ReactElement; metadata?: Metadata };

const importAbs = (file: string) => import(/* @vite-ignore */ file);

/**
 * The page's HTML as the server renders it, inside every layout except the
 * root one (which owns <html>/<body>; its own test renders it), plus the page's
 * metadata merged over its layouts' the way Next merges them (shallow, nearest
 * wins).
 */
export async function renderPage(page: PageFile, params: Record<string, string> = {}): Promise<{ html: string; metadata: Metadata }> {
  const mod = (await importAbs(page.file)) as PageModule;
  const props = { params: Promise.resolve(params) };
  let node: ReactNode = await mod.default(props);
  let metadata: Metadata = {};
  const layouts = (await Promise.all(page.layouts.map(importAbs))) as LayoutModule[];
  for (const layout of layouts) metadata = { ...metadata, ...layout.metadata };
  metadata = { ...metadata, ...(mod.generateMetadata ? await mod.generateMetadata(props) : mod.metadata) };
  // The root layout (layouts[0]) owns <html>/<body>: its metadata applies, but
  // the page is not rendered inside it here.
  for (const layout of layouts.slice(1).reverse()) node = layout.default({ children: node });
  return { html: renderToStaticMarkup(node as ReactElement), metadata };
}

export async function pageModule(page: PageFile): Promise<PageModule> {
  return (await importAbs(page.file)) as PageModule;
}

export function parse(html: string): Document {
  return new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");
}

/** Every JSON-LD block on the page, parsed. Throws if one isn't valid JSON. */
export function jsonLd(doc: Document): Record<string, unknown>[] {
  return [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
    const data = JSON.parse(s.textContent ?? "") as Record<string, unknown> | Record<string, unknown>[];
    return Array.isArray(data) ? data : [data];
  });
}
