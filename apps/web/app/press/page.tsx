import { CONTACT_EMAIL, siteUrl } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { services } from "@zeno/service-catalog";
import { ContentShell } from "@/components/site/ContentShell";
import { JsonLd } from "@/components/site/JsonLd";
import styles from "@/components/site/content.module.css";

// W8.3 (docs/WEB_PLAN.md): what a journalist or a listing needs, on one page,
// with nothing to ask for: the name, one paragraph, the facts, the marks and
// pictures (all drawn in code, ours to give), and the address to write to.
export const metadata: Metadata = pageMetadata({
  title: "Press kit: the name, the facts, the pictures",
  description:
    "Zeno for journalists and listings: what it is in one paragraph, the facts, the logo and pictures you may use, and who to write to. No bank login required.",
  path: "/press"
});

const FACTS: [string, string][] = [
  ["Name", "Zeno (lower-case wordmark: zeno)"],
  ["What it is", "A subscription tracker for iOS and Android that works without a bank login"],
  ["How it finds subscriptions", "Receipts in an inbox you connect, read-only, when you tap scan; statement files you export; entries you add"],
  ["What it does with them", "Warns before each renewal and trial conversion, walks you through cancelling, and marks a cancellation verified only when the renewal date passes with no new charge"],
  ["Where the data lives", "Encrypted on the phone; the servers hold an email address, an account id and, for families, a display name and a monthly total"],
  ["Status", "Pre-launch, with a waitlist; the iOS and Android apps are in development"],
  ["Price", "Free for up to 10 subscriptions; Pro $3.99 a month or $29.99 a year; Lifetime $79.99 once; Family $6.99 a month for five"],
  ["Who makes it", "An independent product, built and run by its founder, paid for by its plans; no advertising, no sale of data"]
];

const PICTURES: [string, string, string][] = [
  ["Logo mark (SVG)", "/icon.svg", "The double-ruled Z mark, in the brand ink; scales to any size"],
  ["Logo mark (PNG, 180 px)", "/apple-icon.png", "The same mark on the brand paper colour"],
  ["Share card", "/og/home.png", "1200 by 630: wordmark, strapline, the no-bank-login line"],
  ["Where subscriptions hide", "/art/find-three-places.webp", "An inbox, an app store and a bank statement, 1200 by 675"],
  ["A free trial on the calendar", "/art/trial-calendar.webp", "Four weeks with the conversion day marked, 1200 by 675"],
  ["The path to the cancel button", "/art/cancel-maze.webp", "Six boxes, three of them offers to decline, 1200 by 675"]
];

export default function PressPage() {
  return (
    <ContentShell
      eyebrow="Press kit"
      title="Zeno, for people writing about it"
      lead="Everything on this page may be quoted or reproduced with the name Zeno beside it. The pictures were drawn for this site and are ours to give; nothing here is stock. For anything not covered, write to the address at the end."
    >
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Press kit", item: siteUrl("/press") }
          ]
        }}
      />

      <h2>In one paragraph</h2>
      <p>
        Zeno is a subscription tracker for iOS and Android that never asks for a bank login. It finds the subscriptions you pay for in the
        receipts in an inbox you connect and in the statement files you export. It warns you before each one renews, and walks you through
        cancelling with a guide for each of {services.length} services. A cancellation counts as done only when the renewal date passes with no
        new charge. The list stays encrypted on your phone.
      </p>

      <h2>The facts</h2>
      <ul className={styles.list}>
        {FACTS.map(([k, v]) => (
          <li key={k}>
            <span>{k}</span>
            <span className={styles.tag}>{v}</span>
          </li>
        ))}
      </ul>

      <h2>Pictures and marks</h2>
      <p>Open any of these to save it. Please keep the mark its own colour on a plain background, and do not redraw it.</p>
      <ul className={styles.list}>
        {PICTURES.map(([name, href, note]) => (
          <li key={href}>
            <span>
              <a href={href}>{name}</a>: {note}
            </span>
          </li>
        ))}
      </ul>

      <h2>Figures you can quote</h2>
      <p>
        The site&rsquo;s own numbers are counted from Zeno&rsquo;s catalogue when a page is built. The <Link href="/blog">blog</Link> states
        them with that caveat: how many services are rated hard to cancel, what the typical subscription costs, and which categories let you go
        easily. Quote them with the date of the page.
      </p>

      <h2>Write to us</h2>
      <p>
        Press questions and interview requests: <a href={`mailto:${CONTACT_EMAIL.feedback}`}>{CONTACT_EMAIL.feedback}</a>. For how the
        service handles data, the <Link href="/legal/privacy">privacy policy</Link> is written to be read; for who makes it, see{" "}
        <Link href="/about">about</Link>.
      </p>

      <div className={styles.backRow}>
        <Link href="/">← Back to Zeno</Link>
      </div>
    </ContentShell>
  );
}
