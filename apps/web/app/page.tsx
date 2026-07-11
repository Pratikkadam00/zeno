import { serviceRecords } from "@zeno/service-catalog";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/site/Footer";
import { MarginIndex, PenRule, RunningTally } from "@/components/site/pen";
import { AnalyticsTeaser, FAQ, FinalCTA, Method, Pricing, Refusal, TheCase, type CaseStats } from "@/components/site/sections";
import { FAQS } from "@/components/site/faq-data";
import { JsonLd } from "@/components/site/JsonLd";
import { isPublicAnalyticsEnabled } from "@/lib/analytics-flag";

// Decode the few HTML entities used in the FAQ copy so the JSON-LD carries clean text.
const decode = (s: string) =>
  s.replace(/&rsquo;/g, "’").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”").replace(/&mdash;/g, "—").replace(/&amp;/g, "&");

export default function HomePage() {
  const showAnalytics = isPublicAnalyticsEnabled();

  // "The Case" exhibits — computed at build from the real catalog, never
  // hardcoded. hard + dark_pattern = the services that fight you on the way
  // out; the quote is a verbatim first step from a documented dark-pattern
  // guide (falls back gracefully if none exists).
  const hardCount = serviceRecords.filter((s) => s.cancellationDifficulty === "hard" || s.cancellationDifficulty === "dark_pattern").length;
  const darkExample = serviceRecords.find((s) => s.cancellationDifficulty === "dark_pattern" && s.cancellationGuideSteps.length > 0);
  const stats: CaseStats = {
    total: serviceRecords.length,
    hardCount,
    quote: darkExample ? { service: darkExample.name, step: darkExample.cancellationGuideSteps[0]! } : null
  };

  return (
    <div>
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
      <Nav showAnalytics={showAnalytics} />
      {/* The pen chrome: progress rule, margin index (≥1360px), and the
          running-tally chip that carries the hero's sample bill down the page. */}
      <PenRule />
      <MarginIndex />
      <RunningTally />
      <main id="main">
        <Hero />
        <TheCase stats={stats} />
        <Method />
        <Refusal />
        {showAnalytics ? <AnalyticsTeaser /> : null}
        <Pricing />
        <FAQ faqs={FAQS} />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
