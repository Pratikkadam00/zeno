import { siteUrl } from "@/lib/site";
import { POSTS, fillFigures } from "../posts";

// RSS 2.0 of the blog (SEO.md §7.3), built from the same POSTS the index, the
// post pages and the sitemap read, with each post's real publish date.
// Advertised on /blog through `alternates.types`.
export const dynamic = "force-static";

const xml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function GET(): Response {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const rfc822 = (date: string) => new Date(`${date}T00:00:00.000Z`).toUTCString();
  const items = posts
    .map((post) => {
      const url = siteUrl(`/blog/${post.slug}`);
      return [
        "    <item>",
        `      <title>${xml(fillFigures(post.title))}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${rfc822(post.date)}</pubDate>`,
        `      <description>${xml(fillFigures(post.description))}</description>`,
        "    </item>"
      ].join("\n");
    })
    .join("\n");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>The Zeno blog</title>",
    `    <link>${siteUrl("/blog")}</link>`,
    `    <atom:link href="${siteUrl("/blog/feed.xml")}" rel="self" type="application/rss+xml"/>`,
    "    <description>Plain guides to finding, tracking and cancelling the subscriptions you pay for.</description>",
    "    <language>en</language>",
    `    <lastBuildDate>${rfc822(posts[0]!.date)}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
    ""
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
