import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import hubStyles from "../cancel/cancel-hub.module.css";
import { POSTS } from "./posts";

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

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

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
      <ul className={hubStyles.relatedGrid}>
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
            <p>
              <time dateTime={post.date}>{dateLabel(post.date)}</time> · {post.description}
            </p>
          </li>
        ))}
      </ul>
      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
