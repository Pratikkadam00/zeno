import { WaitlistForm } from "@/components/site/WaitlistForm";
import styles from "@/app/compare/compare.module.css";

// Zeno is pre-launch (confirmed with the founder) — there is no live App
// Store/Play Store listing to send a comparison-page CTA to yet. The honest,
// working CTA today is the same waitlist form the homepage already uses.
export function ComparePageCta({ title }: { title: string }) {
  return (
    <div className={styles.ctaRow}>
      <p className={styles.ctaTitle}>{title}</p>
      <p className={styles.ctaSub}>Zeno is pre-launch — join the waitlist and we&rsquo;ll email you the moment it&rsquo;s available.</p>
      <div className={styles.ctaForm}>
        <WaitlistForm compact />
      </div>
    </div>
  );
}
