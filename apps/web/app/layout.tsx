import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { MotionProvider } from "@/components/site/MotionProvider";
import { JsonLd } from "@/components/site/JsonLd";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-display", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://zeno.app"),
  alternates: { canonical: "/" },
  title: "Zeno — Know what you pay. Cancel before it charges.",
  description: "Zeno finds every subscription you pay for, warns you before each renewal, and gets you to cancel in one tap — without ever needing your bank login. Join the waitlist.",
  keywords: "subscription manager, cancel subscriptions, subscription tracker app, renewal reminders, free trial tracker",
  openGraph: {
    title: "Zeno — Know what you pay. Cancel before it charges.",
    description: "The subscription radar that finds every recurring charge, warns you before renewals, and cancels in one tap. No bank login required. Join the waitlist.",
    url: "https://zeno.app",
    siteName: "Zeno",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Zeno — subscription radar" }]
  },
  twitter: { card: "summary_large_image", title: "Zeno — Know what you pay.", description: "Find every subscription, get warned before renewals, cancel in one tap." }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-to-content">Skip to content</a>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Zeno",
              url: "https://zeno.app",
              logo: "https://zeno.app/og.png",
              description: "Zeno is a subscription manager that finds every recurring charge, warns you before renewals, and helps you cancel in one tap — without your bank login."
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
