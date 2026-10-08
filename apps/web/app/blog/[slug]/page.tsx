import { siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { ORG_ID, WEBSITE_ID, pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import hubStyles from "../../cancel/cancel-hub.module.css";
import { Picture } from "@/components/site/Picture";
import { POSTS, dateLabel, fillFigures, findPost, postWords, readingMinutes } from "../posts";

// Only the posts in posts.ts exist (as the cancel guides: F183).
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) {
    return { title: { absolute: "Post not found | Zeno" }, description: "We could not find that post. Browse the Zeno blog for guides on finding, tracking and cancelling subscriptions." };
  }
  const published = `${post.date}T00:00:00.000Z`;
  return pageMetadata({
    title: fillFigures(post.title),
    description: fillFigures(post.description),
    path: `/blog/${slug}`,
    type: "article",
    publishedTime: published,
    // W3.6: an edit that changes what the post says sets `updated` on the post.
    modifiedTime: `${post.updated ?? post.date}T00:00:00.000Z`
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) {
    notFound();
  }

  const words = postWords(post);
  const published = `${post.date}T00:00:00.000Z`;
  const modified = `${post.updated ?? post.date}T00:00:00.000Z`;
  const others = POSTS.filter((p) => p.slug !== slug);

  return (
    <ContentShell eyebrow={`By Zeno · ${dateLabel(post.date)}${post.updated ? ` · updated ${dateLabel(post.updated)}` : ""} · ${readingMinutes(post)} min read`} title={fillFigures(post.title)} lead={fillFigures(post.lead)}>
      <Picture picture={post.hero} kind="hero" priority />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: fillFigures(post.title),
          description: fillFigures(post.description),
          datePublished: published,
          dateModified: modified,
          wordCount: words,
          inLanguage: "en",
          image: siteUrl(`/art/${post.hero.art}.webp`),
          url: siteUrl(`/blog/${slug}`),
          // The site's one Organization (lib/structured-data.ts), by reference.
          author: { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          isPartOf: { "@id": WEBSITE_ID },
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
            { "@type": "ListItem", position: 3, name: fillFigures(post.title), item: siteUrl(`/blog/${slug}`) }
          ]
        }}
      />

      {post.sections.map((section, i) => (
        <section key={section.heading ?? i}>
          {section.heading ? <h2>{section.heading}</h2> : null}
          {section.figure ? <Picture picture={section.figure} kind="figure" /> : null}
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
