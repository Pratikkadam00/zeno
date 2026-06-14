import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/site/Footer";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { AnalyticsTeaser, FAQ, Features, FinalCTA, HowItWorks, Pricing, Stats } from "@/components/site/sections";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <ScrollProgress />
      <Nav />
      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        <AnalyticsTeaser />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
