import { CONTACT_EMAIL, siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { services } from "@zeno/service-catalog";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";

// W3.1 (docs/WEB_PLAN.md): who stands behind the site. Zeno is the name the
// product trades under (D18: no address, no personal data on the site); the
// facts here are the ones the code and the policies make true.
export const metadata: Metadata = pageMetadata({
  title: "About Zeno: who makes it and how it is paid for",
  description:
    "Zeno is an independent subscription tracker, paid for by its plans, with no advertising and no sale of data. Why it exists, how it is built, how to reach us.",
  path: "/about"
});

export default function AboutPage() {
  return (
    <ContentShell
      eyebrow="About"
      title="Who makes Zeno, and why"
      lead="Zeno is a subscription tracker for iOS and Android that works without a bank login. It is built and run by its founder as an independent product. It is paid for by its plans, carries no advertising, and does not sell data."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "About", item: siteUrl("/about") }
          ]
        }}
      />

      <h2>Why it exists</h2>
      <p>
        Most subscription apps begin by asking for your bank credentials, handed to a data aggregator that reads your transactions back.
        Plenty of people are fine with that. Plenty are not, and had no good option. Zeno is for the second group: it finds subscriptions
        in the receipts in an inbox you connect and in the statement files you export yourself, keeps the list encrypted on your phone,
        and never asks for a bank login.
      </p>

      <h2>How it is built</h2>
      <p>
        The figures on this site are counted from the same catalogue the app uses, at the moment the site is built: {services.length}{" "}
        services, each with a cancellation guide. A test runs over every page and checks each claim about the app against the code that
        makes it true, so the site cannot promise something the app does not do. The service behind sign-in and billing is checked against
        published security standards (the OWASP application and mobile standards), and security researchers can find a reporting
        address in the site&rsquo;s security.txt file. How data is handled is set out in the <Link href="/legal/privacy">privacy policy</Link>.
      </p>

      <h2>How it is paid for</h2>
      <p>
        By the plans on the <Link href="/#pricing">pricing section</Link>: a free plan that stays free, a paid plan, a single payment
        for people who would rather not add a subscription, and a family plan. There are no advertisements on the site or in the app, no
        analytics scripts on the site, and your data is not sold or rented to anyone.
      </p>

      <h2>What Zeno is not</h2>
      <p>
        It is not a bank, not a financial adviser, and not a service that cancels on your behalf. It shows you the steps, warns you before
        a charge, and checks that a cancellation stuck. The decisions are yours.
      </p>

      <h2>Writing about Zeno?</h2>
      <p>
        The <Link href="/press">press kit</Link> has the one-paragraph description, the facts, and the logo and pictures you may use.
      </p>

      <h2>Reach us</h2>
      <ul className={styles.list}>
        <li>
          <span>Questions and feedback</span>
          <span className={styles.code}>{CONTACT_EMAIL.feedback}</span>
        </li>
        <li>
          <span>Privacy and data requests</span>
          <span className={styles.code}>{CONTACT_EMAIL.privacy}</span>
        </li>
        <li>
          <span>Security reports</span>
          <span className={styles.code}>{CONTACT_EMAIL.security}</span>
        </li>
      </ul>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
