import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import styles from "./legal.module.css";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <Nav />
      <main className={styles.main}>
        <article className={styles.article}>{children}</article>
      </main>
      <Footer />
    </div>
  );
}
