import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { summarizeSpendTwin } from "@zeno/shared";
import { ContentShell } from "@/components/site/ContentShell";
import styles from "@/components/site/content.module.css";

// The example sentence is produced by the app's own function
// (packages/shared/src/spend/twin.ts) from a sample total, so the page can
// never show a comparison the app would not.
export const metadata: Metadata = pageMetadata({
  title: "Spend Twin: your total as things you know",
  description:
    "Spend Twin restates your monthly subscription total as everyday things: meals, gym months, grocery weeks. Computed on your phone, never sent anywhere.",
  path: "/features/spend-twin"
});

export default function SpendTwinFeaturePage() {
  return (
    <ContentShell
      eyebrow="Spend Twin · in the app"
      title="Your subscription total, as things you already know the price of"
      lead="A monthly total is a number. Most people cannot feel it. Spend Twin restates the same total as a count of ordinary things, and the count is what people react to."
    >
      <h2>An example</h2>
      <p>For a sample total of $284 a month, the app says:</p>
      <blockquote>{summarizeSpendTwin(28400)}</blockquote>
      <p>
        That sentence was produced by the app&rsquo;s own code from the sample figure. On your phone it reads the same way, with your own
        total in it.
      </p>

      <h2>How the comparison is made</h2>
      <p>
        The app keeps a short list of everyday things with a typical price in US dollars: a meal, a month at a mainstream gym, a week of
        groceries, a weekend flight fund. Your monthly total is divided by each price and the two that fit best are shown. If your home
        currency is not the dollar, the prices are converted with the exchange rate the app holds; with no usable rate, no comparison is
        shown rather than a wrong one.
      </p>

      <h2>Where it runs</h2>
      <p>
        On your phone, from the encrypted subscription list that every other screen uses. Nothing about your total leaves the device to
        make this sentence. The same rule applies to the budgets, the calendar and the insights: they are views of the list, computed
        where the list lives.
      </p>

      <h2>Why it is in the app</h2>
      <p>
        The point of a subscription tracker is the decision at the end: keep it or cancel it. A total stated as &ldquo;four gym
        memberships&rdquo; makes that decision easier to take than &ldquo;$284.00&rdquo; does. Spend Twin is included on every plan.
      </p>

      <div className={styles.backRow}>
        <Link href="/features">← All features</Link>
      </div>
    </ContentShell>
  );
}
