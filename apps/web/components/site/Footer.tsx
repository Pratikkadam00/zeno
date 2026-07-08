import Link from "next/link";
import { isPublicAnalyticsEnabled } from "@/lib/analytics-flag";
import styles from "../../app/home.module.css";

export function Footer() {
  const productLinks: [string, string][] = [["Features", "#features"], ["How it works", "#how"], ["Pricing", "#pricing"]];
  if (isPublicAnalyticsEnabled()) {
    productLinks.push(["Analytics", "/analytics"]);
  }
  productLinks.push(["Waitlist", "#waitlist"]);

  const cols = [
    { h: "Product", links: productLinks },
    { h: "Company", links: [["Developers", "/developers"], ["Partners", "/partners"], ["Open banking", "/features/open-banking"], ["Spend twin", "/features/spend-twin"]] },
    { h: "Legal", links: [["Privacy policy", "/legal/privacy"], ["Terms of service", "/legal/terms"], ["Cookie policy", "/legal/cookies"]] }
  ] as const;

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <Link href="/" className={styles.brand}><span className={styles.brandMark}>Z</span>Zeno</Link>
            <p className={styles.footerBlurb}>The subscription radar that finds what you pay for and helps you cancel before it charges. No bank login, ever.</p>
          </div>
          {cols.map((c) => (
            <div key={c.h} className={styles.footerCol}>
              <h4>{c.h}</h4>
              {c.links.map(([label, href]) => (
                href.startsWith("#")
                  ? <a key={label} href={href}>{label}</a>
                  : <Link key={label} href={href}>{label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getUTCFullYear()} Zeno. All rights reserved.</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>Know what you pay.</span>
        </div>
      </div>
    </footer>
  );
}
