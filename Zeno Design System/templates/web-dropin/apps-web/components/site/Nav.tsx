"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import styles from "../../app/home.module.css";

const baseLinks = [
  { href: "/#how", label: "How it works" },
  { href: "/cancel", label: "Cancel guides" },
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

/* Both themes are art-directed (paper / the 11pm ledger), so the toggle is
   first-class chrome. Applies .dark + persists to zeno-theme; the inline
   script in layout.tsx restores it before first paint. */
function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("zeno-theme", next ? "dark" : "light");
    } catch {
      /* private mode — theme just won't persist */
    }
  };
  return (
    <button type="button" className={styles.themeBtn} onClick={toggle} aria-label={mounted && dark ? "Switch to light theme" : "Switch to dark theme"}>
      {mounted && dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
    </button>
  );
}

/* The seal — Zeno's double-ruled Z mark, inline so it inherits currentColor. */
function Seal({ size = 24 }: { size?: number }) {
  return (
    <svg className={styles.brandSeal} width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="51" stroke="currentColor" strokeWidth="7" />
      <circle cx="60" cy="60" r="41" stroke="currentColor" strokeWidth="2.5" />
      <path d="M43 45 H77 L43 75 H77" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
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
          <Seal />
          zeno
        </Link>
        <div className={styles.navLinks}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={styles.navLink}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className={styles.navRight}>
          <ThemeToggle />
          <Link href="/#waitlist" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
            Join waitlist
          </Link>
          <button
            type="button"
            className={styles.navToggle}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className={`${styles.navToggleBars} ${open ? styles.navToggleBarsOpen : ""}`} aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu (rendered below 900px) */}
      <div className={`${styles.navBackdrop} ${open ? styles.navBackdropOpen : ""}`} onClick={() => setOpen(false)} aria-hidden />
      <div id="mobile-nav" className={`${styles.navMenu} ${open ? styles.navMenuOpen : ""}`} hidden={!open}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={styles.navMenuLink} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <Link href="/#waitlist" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setOpen(false)}>
          Join waitlist
        </Link>
      </div>
    </nav>
  );
}
