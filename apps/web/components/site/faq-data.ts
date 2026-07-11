// Plain (non-client) data module so both the client FAQ accordion and the
// server-rendered FAQPage JSON-LD share one source of truth. Imported ONLY
// from Server Components (page.tsx passes it down as props) so the service
// catalog never enters the client bundle.
import { services } from "@zeno/service-catalog";

// Real catalog size, computed — never a rounded marketing guess.
const SERVICE_COUNT = services.length;

export const FAQS = [
  {
    q: "When does Zeno launch?",
    a: "We&rsquo;re finishing the iOS and Android builds now. Join the waitlist and you&rsquo;ll be among the first invited when we reach the App Store and Play Store — founding members get 3 months of Pro free."
  },
  {
    q: "Do I have to connect my bank?",
    a: "No — and that&rsquo;s the point. Zeno discovers subscriptions from email receipts and bank-statement CSVs you import yourself. We never ask for bank credentials, and there&rsquo;s no data aggregator in the loop."
  },
  {
    q: "How does discovery actually work?",
    a: `You start a scan of billing receipts in an inbox you connect (read-only), or import a statement CSV from any bank. Zeno reads them on your device — a scan runs when you tap scan, not in the background — and matches charges against a ${SERVICE_COUNT}-service catalog to fill in prices, cycles and cancellation guides.`
  },
  {
    q: "Can Zeno cancel subscriptions for me?",
    a: "Zeno takes you straight to each service&rsquo;s real cancellation flow with step-by-step guidance and warnings about known dark patterns — then checks your next receipt or statement before marking it cancelled. No silent failures, and you stay in control of the final confirmation."
  },
  {
    q: "Is my data private?",
    a: "Your subscription data is encrypted on your device and protected by a biometric app lock. Discovery runs locally, nothing is sold, and there are no data brokers involved."
  },
  {
    q: "What will it cost?",
    a: "Free forever for up to 10 subscriptions — including reminders, cancellation guides with verification, and insights. Pro is $3.99/mo or $29.99/year (37% less) and adds unlimited subscriptions, category budgets and envelope budgeting. Prefer to pay once? Lifetime is a single $79.99 payment — no renewal, ever. Family is $6.99/mo for up to 5 people."
  }
] as const;

export type Faq = { q: string; a: string };
