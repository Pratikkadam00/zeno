import Link from "next/link";
import { isPublicAnalyticsEnabled } from "@/lib/analytics-flag";
import styles from "../../app/home.module.css";

/* The footer is the document's index — every route the site owns, plainly
   listed. No social chrome, no invented traction. */
export function Footer() {
  const productLinks: [string, string][] = [
    ["How it works", "/#how"],
    ["Subscription tracker", "/subscription-tracker"],
    ["Cancel subscriptions", "/cancel-subscriptions"],
    ["Free trial reminders", "/free-trial-reminders"],
    ["Budgeting", "/budgeting"],
    ["Pricing", "/#pricing"],
    ["Cancellation guides", "/cancel"],
    ["FAQ", "/#faq"]
  ];
  if (isPublicAnalyticsEnabled()) {
    productLinks.push(["Analytics (sample data)", "/analytics"]);
  }
  productLinks.push(["Join the waitlist", "/#waitlist"]);

  const cols = [
    { h: "Product", links: productLinks },
    {
      h: "Compare",
      links: [
        ["Rocket Money alternative", "/compare/rocket-money-alternative"],
        ["YNAB alternative", "/compare/ynab-alternative"],
        ["Monarch alternative", "/compare/monarch-alternative"],
        ["No bank login", "/compare/no-bank-login"],
        ["Budgeting without bank sync", "/compare/budget-app-no-bank-sync"]
      ]
    },
    {
      h: "Features",
      links: [
        ["Family Vault", "/features/family-vault"],
        ["Spend Twin", "/features/spend-twin"],
        ["Roadmap", "/roadmap"]
      ]
    },
    {
      h: "Company",
      links: [
        ["About", "/about"],
        ["Blog", "/blog"],
        ["Press kit", "/press"],
        ["Privacy policy", "/legal/privacy"],
        ["Terms of service", "/legal/terms"],
        ["Cookie policy", "/legal/cookies"]
      ]
    }
  ] as const;

  return (
    <>
      {/* The sheet above ends ragged; the footer is the page beneath it. */}
      <div className={styles.tear} aria-hidden="true" />
      <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div>
            <Link href="/" className={styles.brand}>
              <svg width="24" height="24" viewBox="0 0 120 120" fill="none" aria-hidden="true">
                <circle cx="60" cy="60" r="51" stroke="currentColor" strokeWidth="7" />
                <circle cx="60" cy="60" r="41" stroke="currentColor" strokeWidth="2.5" />
                <path d="M43 45 H77 L43 75 H77" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              zeno
            </Link>
            <p className={styles.footerBlurb}>
              Zeno finds your subscriptions in receipts and statements you control, warns you before every renewal, and verifies each cancellation. No
              bank login required.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h} className={styles.footerCol}>
              {/* h2, not h4: the pages' outline runs h1 → h2, and a jump to h4
                  skipped two levels (Lighthouse heading-order, measured on the
                  live site 2026-10-04). The look is the same (home.module.css). */}
              <h2>{c.h}</h2>
              {/* Homepage sections are plain links to "/#…" (F168: they were
                  "#…", which on any other page pointed at nothing). On the
                  homepage itself "/#how" is still an in-page jump, no reload. */}
              {c.links.map(([label, href]) =>
                href.startsWith("/#") ? (
                  <a key={label} href={href}>
                    {label}
                  </a>
                ) : (
                  <Link key={label} href={href}>
                    {label}
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getUTCFullYear()} Zeno. All rights reserved.</span>
          <span className={styles.footerMotto}>KNOW WHAT YOU PAY.</span>
        </div>
      </div>
      </footer>
    </>
  );
}
