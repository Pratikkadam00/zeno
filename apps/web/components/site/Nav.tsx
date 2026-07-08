"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Magnetic } from "./primitives";
import styles from "../../app/home.module.css";

const baseLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" }
];
const analyticsLink = { href: "/analytics", label: "Analytics" };
const faqLink = { href: "/#faq", label: "FAQ" };

export type NavProps = {
  // Server-computed (isPublicAnalyticsEnabled reads a non-NEXT_PUBLIC_ env
  // var, unavailable to this Client Component directly) — omitting the link
  // entirely when disabled avoids a dead nav item that 404s on a stock
  // production deploy.
  showAnalytics?: boolean;
};

export function Nav({ showAnalytics = false }: NavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const links = showAnalytics ? [...baseLinks, analyticsLink, faqLink] : [...baseLinks, faqLink];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape, and lock body scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand} onClick={() => setOpen(false)}>
          <span className={styles.brandMark}>Z</span>
          Zeno
        </Link>
        <div className={styles.navLinks}>
          {links.map((l) => (
            <a key={l.href} href={l.href} className={styles.navLink}>{l.label}</a>
          ))}
        </div>
        <div className={styles.navRight}>
          <Magnetic strength={0.3}>
            <a href="/#waitlist" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>Join waitlist</a>
          </Magnetic>
          <button
            type="button"
            className={styles.navToggle}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`${styles.navToggleBars} ${open ? styles.navToggleBarsOpen : ""}`} aria-hidden>
              <span /><span /><span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu (rendered below 900px) */}
      <div
        className={`${styles.navBackdrop} ${open ? styles.navBackdropOpen : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div id="mobile-nav" className={`${styles.navMenu} ${open ? styles.navMenuOpen : ""}`} hidden={!open}>
        {links.map((l) => (
          <a key={l.href} href={l.href} className={styles.navMenuLink} onClick={() => setOpen(false)}>{l.label}</a>
        ))}
        <a href="/#waitlist" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setOpen(false)}>Join waitlist</a>
      </div>
    </nav>
  );
}
