import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { isPublicAnalyticsEnabled } from "@/lib/analytics-flag";
import styles from "./legal.module.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Nav showAnalytics={isPublicAnalyticsEnabled()} />
      {/* id="main": the root layout's "Skip to content" target (F170). */}
      <main id="main" className={styles.main}>
        <article className={styles.article}>{children}</article>
      </main>
      <Footer />
    </div>
  );
}
