import { SITE_URL, siteUrl } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import type { Metadata } from "next";
import { fontClassNames } from "./fonts";
import { MotionProvider } from "@/components/site/MotionProvider";
import { JsonLd } from "@/components/site/JsonLd";
import "./globals.css";

// The Honest Ledger type trio (./fonts.ts): self-hosted files, served from
// /_next/static, so font-src 'self' holds and the build needs no network (F103).

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: "Zeno — Know what you pay. Cancel before it charges.",
  description:
    "Zeno finds every subscription you pay for — from email receipts and statements you control — warns you before each renewal, and walks you through cancelling. No bank login required. Join the waitlist.",
  keywords: "subscription manager, cancel subscriptions, subscription tracker app, renewal reminders, free trial tracker",
  openGraph: {
    title: "Zeno — Know what you pay. Cancel before it charges.",
    description:
      "The honest way to take back your subscriptions: discovery from receipts you control, warnings before every renewal, cancellations that get verified. No bank login required.",
    url: SITE_URL,
    siteName: "Zeno",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno — the honest subscription ledger" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Zeno — Know what you pay.",
    description: "Find every subscription, get warned before renewals, cancel with a verified guide. No bank login required."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Zeno",
              url: SITE_URL,
              logo: siteUrl("/og.png"),
              description:
                "Zeno is a subscription manager that finds recurring charges from receipts and statements you control, warns you before renewals, and helps you cancel — without your bank login."
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Zeno",
              url: SITE_URL
            }
          ]}
        />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
