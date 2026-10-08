import { CONTACT_EMAIL, SITE_HOST } from "@/lib/site";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import styles from "../legal.module.css";

export const metadata: Metadata = pageMetadata({
  title: "Cookie policy",
  description:
    "How the Zeno marketing website uses cookies and local storage: strictly necessary storage only. No analytics, no ad tracking, no cross-site profiling.",
  path: "/legal/cookies"
});

const sections = [
  ["overview", "1. Overview"],
  ["what-are-cookies", "2. What cookies & local storage are"],
  ["essential", "3. Essential cookies"],
  ["analytics", "4. Analytics"],
  ["no-ads", "5. No ad tracking"],
  ["controls", "6. How to control cookies"],
  ["app", "7. The Zeno app"],
  ["changes", "8. Changes to this policy"],
  ["contact", "9. Contact us"]
];

export default function CookiesPage() {
  return (
    <>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>Cookie Policy</h1>
      <p className={styles.updated}>Last updated: October 2, 2026</p>
      <hr className={styles.rule} />

      <p className={styles.lede}>
        The Zeno marketing site is deliberately minimal. It sets no cookies. The only thing it
        stores in your browser is your light/dark theme choice, and only after you choose one. We do
        not run analytics, and we do not track you across the web or serve ads.
      </p>

      <div className={styles.note}>
        <strong>Pre-launch notice.</strong> While Zeno is in pre-launch, this site mainly exists to
        explain the product and collect waitlist sign-ups, so it needs no cookies. This
        policy will be reviewed and finalized before the app launches.
      </div>

      <nav className={styles.toc} aria-label="Table of contents">
        <p className={styles.tocHeading}>On this page</p>
        <ul className={styles.tocList}>
          {sections.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="overview">1. Overview</h2>
      <p>
        This Cookie Policy explains how the Zeno website ({SITE_HOST}) uses cookies and similar
        browser storage. It complements our{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>, which describes how we handle personal
        data more broadly.
      </p>

      <h2 id="what-are-cookies">2. What cookies & local storage are</h2>
      <p>
        Cookies are small text files a website can store in your browser. Related technologies,
        such as <strong>local storage</strong> and <strong>session storage</strong>, let a site
        remember small pieces of information between page loads. They can be
        &ldquo;essential&rdquo; (needed for the site to function) or
        &ldquo;optional&rdquo; (used for things like analytics that you can decline).
      </p>

      <h2 id="essential">3. Essential cookies</h2>
      <p>
        The site sets <strong>no cookies</strong>, essential or otherwise, so there is nothing to
        consent to. It keeps one item in your browser&rsquo;s local storage:{" "}
        <code>zeno-theme</code>, your light/dark choice, written only when you press the theme
        button and read back when you return so the page doesn&rsquo;t flash the other theme. It
        never leaves your browser. The waitlist form needs no storage at all.
      </p>

      <h2 id="analytics">4. Analytics</h2>
      <p>
        Zeno does <strong>not</strong> run analytics on this website. There is no page-view
        tracking, product analytics, session recording, or browser fingerprinting. If we ever
        introduce privacy-respecting analytics, we will update this policy first, and obtain your
        consent where the law requires it, before turning anything on.
      </p>

      <h2 id="no-ads">5. No ad tracking</h2>
      <p>
        We do <strong>not</strong> use advertising cookies, third-party ad networks, or
        cross-site tracking pixels, and we do not sell your data. Zeno&rsquo;s business is the app,
        not advertising.
      </p>

      <h2 id="controls">6. How to control cookies</h2>
      <p>You are in control. You can:</p>
      <ul>
        <li>
          block or delete cookies through your browser settings. Most browsers let you clear
          existing cookies and refuse new ones; and
        </li>
        <li>use private/incognito browsing to limit what is stored between sessions.</li>
      </ul>
      <p>
        Blocking storage only means the site forgets your theme choice; everything else,
        including the waitlist form, works the same.
      </p>

      <h2 id="app">7. The Zeno app</h2>
      <p>
        This policy covers the website. The Zeno mobile app does not rely on website cookies; it
        stores your subscription data <strong>encrypted on your device</strong>, as described in
        our <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="changes">8. Changes to this policy</h2>
      <p>
        We may update this Cookie Policy as the site evolves, and we will finalize it before launch.
        Material changes will be reflected in the &ldquo;Last updated&rdquo; date above.
      </p>

      <h2 id="contact">9. Contact us</h2>
      <p>
        Questions about cookies or this policy? Email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL.privacy}`}>{CONTACT_EMAIL.privacy}</a>.
      </p>

      <div className={styles.crosslinks}>
        <span>Related:</span>
        <Link href="/legal/privacy">Privacy Policy</Link>
        <Link href="/legal/terms">Terms of Service</Link>
        <Link href="/legal/cookies">Cookie Policy</Link>
      </div>
    </>
  );
}
