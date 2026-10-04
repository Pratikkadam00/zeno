import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { CardList } from "@/components/site/CardList";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import { POSTS, dateLabel, readingMinutes } from "./posts";

export const metadata: Metadata = {
  title: "Blog — finding, tracking and cancelling subscriptions | Zeno",
  description:
    "Plain guides to the subscriptions you pay for: how to find all of them, how to keep a free trial free, why cancelling is made hard, and how to audit everything in twenty minutes.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "The Zeno blog | Zeno",
    description: "Plain guides to finding, tracking and cancelling subscriptions.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
  }
};

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
