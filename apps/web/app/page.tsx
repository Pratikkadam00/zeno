import { serviceRecords } from "@zeno/service-catalog";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/site/Footer";
import { LedgerBook, type Sheet } from "@/components/site/LedgerBook";
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

  // The homepage story, in order. LedgerBook renders these as one scrolling
  // document by default; when a wide, motion-friendly, capable browser is
  // detected post-hydration it leafs them as page-turn sheets instead.
  const sheets: Sheet[] = [
    { id: "cover", label: "COVER", node: <Hero /> },
    { id: "case", label: "THE CASE", node: <TheCase stats={stats} /> },
    { id: "how", label: "THE METHOD", node: <Method /> },
    { id: "refusal", label: "THE REFUSAL", node: <Refusal /> },
    ...(showAnalytics ? [{ id: "back-office", label: "THE BACK OFFICE", node: <AnalyticsTeaser /> }] : []),
    { id: "pricing", label: "THE BILL", node: <Pricing /> },
    { id: "faq", label: "QUESTIONS", node: <FAQ faqs={FAQS} /> },
    { id: "waitlist", label: "THE CLOSE", node: <FinalCTA /> }
  ];

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
      {/* LedgerBook renders the sections as a scrolling document by default
          (the SEO/CWV/a11y base) and, only when eligible post-hydration, leafs
          them as a page-turn ledger. It owns the pen/tally chrome. */}
      <LedgerBook sheets={sheets} footer={<Footer />} />
    </div>
  );
}
