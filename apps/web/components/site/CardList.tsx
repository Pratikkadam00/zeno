import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./content.module.css";

export type Card = {
  href: string;
  title: string;
  description: string;
  /** A small line above the title: a date and reading time, or a status. */
  meta?: ReactNode;
  /** The call to action at the foot of the card ("Read the post"). */
  cta: string;
};

/**
 * A list of whole-card links, for the hub pages (blog, features, compare).
 * They had reused the related-guides chips (`relatedGrid`), which are sized for
 * a one-line link: the title came out smaller than its own description and the
 * description took the link colour (owner's report, 2026-10-04).
 */
export function CardList({ cards }: { cards: Card[] }) {
  return (
    <ul className={styles.cardList}>
      {cards.map((card) => (
        <li key={card.href}>
          <Link href={card.href} className={styles.cardLink}>
            {card.meta ? <span className={styles.cardMeta}>{card.meta}</span> : null}
            <span className={styles.cardTitle}>{card.title}</span>
            <span className={styles.cardText}>{card.description}</span>
            <span className={styles.cardCta} aria-hidden="true">
              {card.cta} →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
