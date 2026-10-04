import { siteUrl } from "@/lib/site";
import { serviceRecords } from "@zeno/service-catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import hubStyles from "../../cancel/cancel-hub.module.css";
import { POSTS, findPost, postText } from "../posts";

// Only the posts in posts.ts exist (as the cancel guides: F183).
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

// The two figures a post may quote, from the catalog, never typed in.
const SERVICE_COUNT = serviceRecords.length;
const HARD_COUNT = serviceRecords.filter((s) => s.cancellationDifficulty === "hard" || s.cancellationDifficulty === "dark_pattern").length;

export function fillFigures(text: string): string {
  return text.replaceAll("{SERVICE_COUNT}", String(SERVICE_COUNT)).replaceAll("{HARD_COUNT}", String(HARD_COUNT));
}

function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 220));
}

const dateLabel = (iso: string) => new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) {
    return { title: "Post not found — Zeno", description: "We could not find that post. Browse the Zeno blog for guides on finding, tracking and cancelling subscriptions." };
  }
  const title = `${post.title} | Zeno`;
  const path = `/blog/${slug}`;
  return {
    title,
    description: post.description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: post.description,
      url: path,
      type: "article",
      publishedTime: `${post.date}T00:00:00.000Z`,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno subscription manager dashboard" }]
    },
    twitter: { card: "summary_large_image", title, description: post.description }
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) {
    notFound();
  }

  const words = fillFigures(postText(post)).split(/\s+/).filter(Boolean).length;
  const published = `${post.date}T00:00:00.000Z`;
  const others = POSTS.filter((p) => p.slug !== slug);

  return (
    <ContentShell eyebrow={`Zeno blog · ${dateLabel(post.date)} · ${readingMinutes(words)} min read`} title={post.title} lead={fillFigures(post.lead)}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: published,
          dateModified: published,
          wordCount: words,
          inLanguage: "en",
          image: siteUrl("/og.png"),
          author: { "@type": "Organization", name: "Zeno", url: siteUrl("/") },
          publisher: { "@type": "Organization", name: "Zeno", url: siteUrl("/"), logo: { "@type": "ImageObject", url: siteUrl("/og.png") } },
          mainEntityOfPage: { "@type": "WebPage", "@id": siteUrl(`/blog/${slug}`) }
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Blog", item: siteUrl("/blog") },
            { "@type": "ListItem", position: 3, name: post.title, item: siteUrl(`/blog/${slug}`) }
          ]
        }}
      />

      {post.sections.map((section, i) => (
        <section key={section.heading ?? i}>
          {section.heading ? <h2>{section.heading}</h2> : null}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{fillFigures(paragraph)}</p>
          ))}
          {section.list ? (
            section.ordered ? (
              <ol className={styles.steps}>
                {section.list.map((item) => (
                  <li key={item}>{fillFigures(item)}</li>
                ))}
              </ol>
            ) : (
              <ul className={styles.list}>
                {section.list.map((item) => (
                  <li key={item}>{fillFigures(item)}</li>
                ))}
              </ul>
            )
          ) : null}
        </section>
      ))}

      <h2>Related reading</h2>
      <ul className={hubStyles.relatedGrid}>
        {post.related.map(([label, href]) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
          </li>
        ))}
      </ul>

      {others.length > 0 ? (
        <>
          <h2>More from the blog</h2>
          <ul className={hubStyles.relatedGrid}>
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/blog/${p.slug}`}>{p.title}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className={styles.backRow}>
        <Link href="/blog">← All posts</Link>
      </div>
    </ContentShell>
  );
}
