// Plain (non-client) data module so both the client FAQ accordion and the
// server-rendered FAQPage JSON-LD can import the same source of truth.
// (Importing data from a "use client" module into a Server Component yields a
// client-reference proxy, not the array — hence this lives on its own.)
export const FAQS = [
  { q: "When does Zeno launch?", a: "We&rsquo;re finishing the iOS and Android builds now. Join the waitlist and you&rsquo;ll be among the first invited when we hit the App Store and Play Store — founding members get 3 months of Pro free." },
  { q: "Do I have to connect my bank?", a: "No — and that&rsquo;s the point. Zeno discovers subscriptions from email receipts and bank-statement CSVs you import yourself, all scanned on your device. We never ask for bank credentials or use a data aggregator." },
  { q: "How does discovery actually work?", a: "Connect one or more Gmail inboxes and Zeno reads billing receipts (read-only) to detect recurring charges, or import a statement CSV from any bank. It matches them against a 600-service catalog to fill in prices, cycles and cancellation guides." },
  { q: "Can Zeno cancel subscriptions for me?", a: "Zeno takes you straight to each service&rsquo;s real cancellation flow with step-by-step guidance and warnings about dark patterns, so cancelling takes one tap and a few seconds. You stay in control of the final confirmation." },
  { q: "Is my data private?", a: "Yes. Your subscription data is encrypted on your device, protected by a biometric app lock. Discovery happens locally — nothing is sold, and there are no data brokers in the loop." },
  { q: "What will it cost?", a: "Free forever for up to 10 subscriptions. Pro is $3.99/mo — or $29.99/year, saving 37% — for unlimited tracking, full discovery and analytics. Prefer to pay once? Lifetime is a single $79.99 payment, no renewal, ever. Family ($6.99/mo) shares it across up to 5 people. Since the average person wastes ~$219/year on forgotten subscriptions, Pro pays for itself the first thing you cancel." }
] as const;
