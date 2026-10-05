import Link from "next/link";
import { ComparePageCta } from "@/components/site/ComparePageCta";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";
import type { Landing } from "@/lib/landings";
import { WEBSITE_ID } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

// One landing page (lib/landings.ts): the copy, its questions shown on the page
// AND in FAQPage structured data from the same text (SEO.md §4.3: the schema must
// mirror what is visible, word for word), three related guides, and the waitlist.
export function LandingPage({ landing }: { landing: Landing }) {
  const url = siteUrl(landing.path);
  return (
    <ContentShell eyebrow={landing.eyebrow} title={landing.h1} lead={landing.lead}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: landing.eyebrow, item: url }
          ]
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "@id": `${url}#faq`,
          url,
          isPartOf: { "@id": WEBSITE_ID },
          mainEntity: landing.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
        }}
      />

      {landing.sections.map((section) => {
        const List = section.ordered ? "ol" : "ul";
        return (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
            {section.list ? (
              <List className={styles.list}>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </List>
            ) : null}
            {section.after?.map((p) => <p key={p}>{p}</p>)}
          </section>
        );
      })}

      <section>
        <h2>Questions</h2>
        {landing.faqs.map((f) => (
          <div key={f.q}>
            <h3 className={styles.faqQ}>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>

      <ComparePageCta title={landing.cta} />

      <section>
        <h2>Related guides</h2>
        <ul className={styles.list}>
          {landing.related.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>{r.label}</Link>
            </li>
          ))}
        </ul>
      </section>
    </ContentShell>
  );
}
