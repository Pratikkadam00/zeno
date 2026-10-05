import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { ORG_ID, WEBSITE_ID, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { CardList } from "@/components/site/CardList";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import { POSTS, dateLabel, readingMinutes } from "./posts";

export const metadata: Metadata = pageMetadata({
  title: "Subscription guides: find, track and cancel",
  description:
    "Plain guides to the subscriptions you pay for: how to find them all, keep a free trial free, see why cancelling is made hard, and audit it all in 20 minutes.",
  path: "/blog",
  alternates: { types: { "application/rss+xml": "/blog/feed.xml" } }
});

export default function BlogIndexPage() {
  const posts = [...POSTS].sort((a, b) => b.date.localeCompare(a.date)); // newest first
  return (
    <ContentShell
      eyebrow="Zeno blog"
      title="Subscriptions, written down plainly"
      lead="Short, practical pieces on finding what you pay for, keeping trials free, getting past the cancel button that isn't there, and keeping the whole list honest. Nothing here needs a bank login."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${siteUrl("/blog")}#blog`,
          name: "The Zeno blog",
          url: siteUrl("/blog"),
          isPartOf: { "@id": WEBSITE_ID },
          publisher: { "@id": ORG_ID },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: posts.map((post, i) => ({ "@type": "ListItem", position: i + 1, url: siteUrl(`/blog/${post.slug}`), name: post.title }))
          }
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Blog", item: siteUrl("/blog") }
          ]
        }}
      />
      <CardList
        cards={posts.map((post) => ({
          href: `/blog/${post.slug}`,
          title: post.title,
          description: post.description,
          meta: (
            <>
              <time dateTime={post.date}>{dateLabel(post.date)}</time> · {readingMinutes(post)} min read
            </>
          ),
          cta: "Read the post"
        }))}
      />
      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
