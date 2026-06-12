import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zeno.app"),
  title: "Zeno — Know what you pay. Control what you keep.",
  description: "Subscription manager that automatically finds every subscription, warns you before renewals, and gets you to cancel in one tap. No bank login required.",
  keywords: "subscription manager, cancel subscriptions, track subscriptions, subscription tracker app",
  openGraph: {
    title: "Zeno — Know what you pay. Control what you keep.",
    description: "Subscription manager that automatically finds every subscription, warns you before renewals, and gets you to cancel in one tap. No bank login required.",
    url: "https://zeno.app",
    siteName: "Zeno",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Zeno subscription manager dashboard"
      }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
