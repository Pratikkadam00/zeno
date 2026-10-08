// Plain (non-client) data module so both the client FAQ accordion and the
// server-rendered FAQPage JSON-LD share one source of truth. Imported ONLY
// from Server Components (page.tsx passes it down as props) so the service
// catalog never enters the client bundle.
import { services } from "@zeno/service-catalog";

// Real catalog size, computed, never a rounded marketing guess.
const SERVICE_COUNT = services.length;

export const FAQS = [
  {
    q: "When does Zeno launch?",
    a: "We&rsquo;re finishing the iOS and Android apps now. Join the waitlist and you&rsquo;ll be among the first invited when Zeno reaches the App Store and Google Play. Founding members get 3 months of Pro free."
  },
  {
    q: "Do I have to connect my bank?",
    a: "No. Zeno finds subscriptions in email receipts and in bank-statement files you export yourself. It never asks for bank credentials, and no data aggregator sits in between."
  },
  {
    q: "How does discovery work?",
    a: `You connect an inbox (read-only) and tap scan, or you import a statement file from any bank. Zeno reads it on your phone, and a scan runs only when you tap. Each charge is matched against a catalogue of ${SERVICE_COUNT} services, which fills in the usual price, the billing cycle and the cancellation guide.`
  },
  {
    q: "Can Zeno cancel subscriptions for me?",
    a: "Zeno opens the cancellation guide for the service, step by step, with its known traps marked. Then it waits for the renewal date before marking the subscription cancelled. If a receipt or statement you scan or import shows the charge again, Zeno flags it instead. The final confirmation is always yours."
  },
  {
    q: "Is my data private?",
    a: "Your subscription data is encrypted on your phone, and you can lock the app with a PIN, or with biometrics where your phone has them. Discovery runs on the phone. Nothing is sold, and no data broker is involved."
  },
  {
    q: "What will it cost?",
    a: "Free, for up to 10 subscriptions, with reminders, cancellation guides with verification, and insights included. Pro is $3.99 a month or $29.99 a year and adds unlimited subscriptions, category budgets and envelope budgeting. If you would rather pay once, Lifetime is a single payment of $79.99 with no renewal. Family is $6.99 a month for up to 5 people."
  }
] as const;

export type Faq = { q: string; a: string };
