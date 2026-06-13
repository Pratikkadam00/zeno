import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/site/Footer";
import { AnalyticsTeaser, FAQ, Features, FinalCTA, HowItWorks, LogoMarquee, Pricing, Stats } from "@/components/site/sections";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.page}>
      <Nav />
      <main>
        <Hero />
        <LogoMarquee />
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
