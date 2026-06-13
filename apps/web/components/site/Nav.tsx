"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Magnetic } from "./primitives";
import styles from "../../app/home.module.css";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/analytics", label: "Analytics" },
  { href: "/#faq", label: "FAQ" }
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      <div className={styles.navInner}>
        <Link href="/" className={styles.brand}>
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
        </div>
      </div>
    </nav>
  );
}
