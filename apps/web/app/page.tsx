import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/site/Footer";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { AnalyticsTeaser, FAQ, Features, FinalCTA, HowItWorks, Pricing, Stats } from "@/components/site/sections";
import { FAQS } from "@/components/site/faq-data";
import { JsonLd } from "@/components/site/JsonLd";
import { isPublicAnalyticsEnabled } from "@/lib/analytics-flag";
import styles from "./home.module.css";

// Decode the few HTML entities used in the FAQ copy so the JSON-LD carries clean text.
const decode = (s: string) =>
  s.replace(/&rsquo;/g, "’").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
    .replace(/&mdash;/g, "—").replace(/&amp;/g, "&");

export default function HomePage() {
  const showAnalytics = isPublicAnalyticsEnabled();
  return (
    <div className={styles.page}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: decode(f.q),
            acceptedAnswer: { "@type": "Answer", text: decode(f.a) }
          }))
        }}
      />
      <ScrollProgress />
      <Nav showAnalytics={showAnalytics} />
      <main id="main">
        <Hero />
        <Features />
        <HowItWorks />
        <Stats />
        {showAnalytics ? <AnalyticsTeaser /> : null}
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
