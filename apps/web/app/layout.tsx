import type { Metadata } from "next";
import { Space_Grotesk, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { MotionProvider } from "@/components/site/MotionProvider";
import { JsonLd } from "@/components/site/JsonLd";
import "./globals.css";

// The Honest Ledger type trio. next/font downloads at build time and serves
// the woff2 from /_next/static — self-hosted, so font-src 'self' holds.
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://zeno.app"),
  alternates: { canonical: "/" },
  title: "Zeno — Know what you pay. Cancel before it charges.",
  description:
    "Zeno finds every subscription you pay for — from email receipts and statements you control — warns you before each renewal, and walks you through cancelling. No bank login required. Join the waitlist.",
  keywords: "subscription manager, cancel subscriptions, subscription tracker app, renewal reminders, free trial tracker",
  openGraph: {
    title: "Zeno — Know what you pay. Cancel before it charges.",
    description:
      "The honest way to take back your subscriptions: discovery from receipts you control, warnings before every renewal, cancellations that get verified. No bank login required.",
    url: "https://zeno.app",
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

// Applies the saved theme (or OS preference) before first paint so neither
// theme flashes, and arms the html.js class that gates ALL CSS-driven
// entrance choreography (no-JS visitors get the finished page, never a
// hidden one). Inline script is allowed by the CSP ('unsafe-inline' on
// script-src is already required by Next's own hydration inlines).
const THEME_SCRIPT = `document.documentElement.classList.add("js");try{var t=localStorage.getItem("zeno-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
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
              url: "https://zeno.app",
              logo: "https://zeno.app/og.png",
              description:
                "Zeno is a subscription manager that finds recurring charges from receipts and statements you control, warns you before renewals, and helps you cancel — without your bank login."
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Zeno",
              url: "https://zeno.app"
            }
          ]}
        />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
