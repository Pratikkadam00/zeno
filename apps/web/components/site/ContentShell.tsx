import type { ReactNode } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import styles from "./content.module.css";

type ContentShellProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
};

/**
 * Shared dark-brand layout for marketing/content sub-pages (features, cancel
 * guides, partners, developers). Renders the fixed Nav, a centered readable
 * article column on the brand background, and the Footer.
 */
export function ContentShell({ eyebrow, title, lead, children }: ContentShellProps) {
  return (
    <div className={styles.shell}>
      <Nav />
      <main id="main" className={styles.main}>
        <article className={styles.article}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
          <hr className={styles.rule} />
          {children}
        </article>
      </main>
      <Footer />
    </div>
  );
}
